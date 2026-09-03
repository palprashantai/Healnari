import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { AiCreditLedgerEntry } from '../interfaces/ai-globalization.interface';

@Injectable()
export class AiCreditLedgerService {
  private readonly logger = new Logger(AiCreditLedgerService.name);

  // In-memory fallback balance store: userId -> { balance, granted, consumed }
  private inMemoryAccounts: Map<
    string,
    { balance: number; granted: number; consumed: number }
  > = new Map();

  // In-memory fallback ledger logs: userId -> AiCreditLedgerEntry[]
  private inMemoryLedger: Map<string, AiCreditLedgerEntry[]> = new Map();

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Gets current user credit balance and account totals
   */
  async getAccount(userId: string): Promise<{
    balance: number;
    lifetimeGranted: number;
    lifetimeConsumed: number;
  }> {
    try {
      const { data, error } = await this.supabase.admin
        .from('ai_credit_accounts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          balance: data.balance,
          lifetimeGranted: data.lifetime_granted,
          lifetimeConsumed: data.lifetime_consumed,
        };
      }
    } catch {}

    const mem = this.inMemoryAccounts.get(userId) || {
      balance: 5,
      granted: 5,
      consumed: 0,
    };
    return {
      balance: mem.balance,
      lifetimeGranted: mem.granted,
      lifetimeConsumed: mem.consumed,
    };
  }

  /**
   * Grants credits to user account (Subscription activation, pack purchase, bonus)
   */
  async grantCredits(
    userId: string,
    amount: number,
    reason: string,
    referenceId?: string,
    entryType: 'GRANT' | 'BONUS' | 'REFUND' = 'GRANT',
    metadata?: Record<string, any>,
  ): Promise<{ balance: number }> {
    const account = await this.getAccount(userId);
    const newBalance = account.balance + amount;
    const newGranted = account.lifetimeGranted + amount;

    // Update in-memory state
    this.inMemoryAccounts.set(userId, {
      balance: newBalance,
      granted: newGranted,
      consumed: account.lifetimeConsumed,
    });

    const entry: AiCreditLedgerEntry = {
      user_id: userId,
      entry_type: entryType,
      amount,
      balance_after: newBalance,
      reference_id: referenceId,
      reason,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };

    const userLedger = this.inMemoryLedger.get(userId) || [];
    userLedger.unshift(entry);
    this.inMemoryLedger.set(userId, userLedger);

    try {
      // Upsert account
      await this.supabase.admin.from('ai_credit_accounts').upsert(
        {
          user_id: userId,
          balance: newBalance,
          lifetime_granted: newGranted,
          lifetime_consumed: account.lifetimeConsumed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

      // Insert immutable ledger log
      await this.supabase.admin.from('ai_credit_ledger').insert({
        user_id: userId,
        entry_type: entryType,
        amount,
        balance_after: newBalance,
        reference_id: referenceId || null,
        reason,
        metadata: metadata || {},
      });
    } catch (err: any) {
      this.logger.warn(`Credit ledger database write fallback for ${userId}: ${err?.message}`);
    }

    return { balance: newBalance };
  }

  /**
   * Consumes credits from user account for an AI invocation
   */
  async consumeCredits(
    userId: string,
    amount = 1,
    featureKey: string,
    referenceId?: string,
    metadata?: Record<string, any>,
  ): Promise<{ balance: number; success: boolean }> {
    const account = await this.getAccount(userId);

    if (account.balance < amount) {
      return { balance: account.balance, success: false };
    }

    const newBalance = account.balance - amount;
    const newConsumed = account.lifetimeConsumed + amount;

    this.inMemoryAccounts.set(userId, {
      balance: newBalance,
      granted: account.lifetimeGranted,
      consumed: newConsumed,
    });

    const entry: AiCreditLedgerEntry = {
      user_id: userId,
      entry_type: 'CONSUME',
      amount: -amount,
      balance_after: newBalance,
      feature: featureKey,
      reference_id: referenceId,
      reason: `AI Invocation: ${featureKey}`,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };

    const userLedger = this.inMemoryLedger.get(userId) || [];
    userLedger.unshift(entry);
    this.inMemoryLedger.set(userId, userLedger);

    try {
      const { data: updatedAccount, error: upsertError } = await this.supabase.admin
        .from('ai_credit_accounts')
        .upsert(
          {
            user_id: userId,
            balance: newBalance,
            lifetime_granted: account.lifetimeGranted,
            lifetime_consumed: newConsumed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select('balance')
        .maybeSingle();

      if (upsertError) {
        this.logger.warn(
          `Credit consumption DB write rejected for ${userId}: ${upsertError.message}`,
        );
        // Revert in-memory balance to previous state
        this.inMemoryAccounts.set(userId, {
          balance: account.balance,
          granted: account.lifetimeGranted,
          consumed: account.lifetimeConsumed,
        });
        return { balance: account.balance, success: false };
      }

      await this.supabase.admin.from('ai_credit_ledger').insert({
        user_id: userId,
        entry_type: 'CONSUME',
        amount: -amount,
        balance_after: updatedAccount?.balance ?? newBalance,
        feature: featureKey,
        reference_id: referenceId || null,
        reason: `AI Invocation: ${featureKey}`,
        metadata: metadata || {},
      });
    } catch (err: any) {
      this.logger.warn(
        `Credit consumption exception for ${userId}: ${err?.message}`,
      );
      this.inMemoryAccounts.set(userId, {
        balance: account.balance,
        granted: account.lifetimeGranted,
        consumed: account.lifetimeConsumed,
      });
      return { balance: account.balance, success: false };
    }

    return { balance: newBalance, success: true };
  }

  /**
   * Fetches auditable ledger history for user or admin
   */
  async getLedgerHistory(
    userId: string,
    limit = 50,
  ): Promise<AiCreditLedgerEntry[]> {
    try {
      const { data, error } = await this.supabase.admin
        .from('ai_credit_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data as AiCreditLedgerEntry[];
      }
    } catch {}

    return (this.inMemoryLedger.get(userId) || []).slice(0, limit);
  }
}
