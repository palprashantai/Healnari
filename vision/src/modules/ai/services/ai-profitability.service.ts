import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { FXRateService } from '@/core/fx/fx-rate.service';
import { DecimalMath } from '@/core/utils/decimal.util';
import { AiUsageService } from './ai-usage.service';

export interface GlobalProfitabilityDashboard {
  reportingCurrency: string;
  reportingCurrencySymbol: string;
  metrics: {
    totalRevenue: number;
    totalAiCost: number;
    totalGatewayFees: number;
    grossProfit: number;
    grossMarginPercent: number;
    totalActiveSubscribers: number;
    totalAiRequests: number;
    totalCreditsConsumed: number;
    avgCostPerRequest: number;
    arpu: number;
  };
  byCountry: Array<{
    countryCode: string;
    countryName: string;
    flag: string;
    localCurrency: string;
    localRevenue: number;
    reportingRevenue: number;
    reportingCost: number;
    reportingProfit: number;
    marginPercent: number;
    subscribersCount: number;
    requestsCount: number;
  }>;
  byPlan: Array<{
    planId: string;
    planName: string;
    subscribers: number;
    reportingRevenue: number;
    reportingCost: number;
    marginPercent: number;
  }>;
  byModel: Array<{
    model: string;
    provider: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    reportingCost: number;
  }>;
  byFeature: Array<{
    featureKey: string;
    featureName: string;
    requests: number;
    creditsUsed: number;
    reportingCost: number;
  }>;
}

const COUNTRY_FLAGS: Record<string, string> = {
  IN: '🇮🇳',
  US: '🇺🇸',
};

const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  US: 'United States',
};

@Injectable()
export class AiProfitabilityService {
  private readonly logger = new Logger(AiProfitabilityService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly fxRateService: FXRateService,
    private readonly usageService: AiUsageService,
  ) {}

  /**
   * Generates complete global profitability report converted to reporting currency
   */
  async getGlobalProfitability(
    reportingCurrency = 'USD',
  ): Promise<GlobalProfitabilityDashboard> {
    const repCurr = reportingCurrency.toUpperCase();
    const currSymbol =
      repCurr === 'INR'
        ? '₹'
        : repCurr === 'AED'
        ? 'AED '
        : repCurr === 'EUR'
        ? '€'
        : repCurr === 'GBP'
        ? '£'
        : '$';

    let totalRevenueRep = 0;
    let totalCostRep = 0;
    let totalGatewayFeesRep = 0;

    // 1. Fetch live transactions, active subscriptions, and usage logs
    const [
      { data: txns },
      { data: activeSubs },
      { data: usageLogs },
      { data: creditAccounts },
      { data: dbPlans },
    ] = await Promise.all([
      this.supabase.admin
        .from('ai_transactions')
        .select('*')
        .in('status', ['paid', 'success', 'active']),
      this.supabase.admin
        .from('ai_subscriptions')
        .select('*')
        .eq('status', 'active'),
      this.supabase.admin
        .from('ai_usage_logs')
        .select('*'),
      this.supabase.admin
        .from('ai_credit_accounts')
        .select('*'),
      this.supabase.admin
        .from('ai_plans')
        .select('*'),
    ]);

    const paidTxns = txns || [];
    const subs = activeSubs || [];
    const logs = usageLogs || [];
    const accounts = creditAccounts || [];
    const plans = dbPlans || [];

    const totalSubscribers = subs.length;
    const totalAiRequests = logs.length;
    const totalCreditsConsumed = accounts.reduce((sum, a) => sum + (a.lifetime_consumed || 0), 0);

    // Group transactions by country
    const countryDataMap: Record<
      string,
      { localRev: number; localCurr: string; count: number; requests: number; costUsd: number }
    > = {};

    paidTxns.forEach((t) => {
      const cCode = t.country_code || 'IN';
      const origAmt = Number(t.final_amount || t.base_amount || 0);
      const origCurr = t.original_currency || 'INR';

      if (!countryDataMap[cCode]) {
        countryDataMap[cCode] = {
          localRev: 0,
          localCurr: origCurr,
          count: 0,
          requests: 0,
          costUsd: 0,
        };
      }
      countryDataMap[cCode].localRev += origAmt;
      countryDataMap[cCode].count += 1;
    });

    // Map logs to country where available or model costs
    logs.forEach((log) => {
      totalCostRep += Number(log.estimated_cost_usd || 0);
    });

    // Calculate Country-by-Country metrics converted to target reporting currency
    const byCountry = Object.entries(countryDataMap).map(([code, data]) => {
      const fxRev = this.fxRateService.convert(data.localRev, data.localCurr, repCurr);
      const fxCost = this.fxRateService.convert(data.costUsd, 'USD', repCurr);
      const fxGateway = DecimalMath.percentage(fxRev.reportingAmount, 2.0); // 2% avg gateway fee

      const profit = DecimalMath.subtract(
        fxRev.reportingAmount,
        DecimalMath.add(fxCost.reportingAmount, fxGateway),
      );
      const margin =
        fxRev.reportingAmount > 0
          ? Number(((profit / fxRev.reportingAmount) * 100).toFixed(1))
          : 0;

      totalRevenueRep += fxRev.reportingAmount;
      totalCostRep += fxCost.reportingAmount;
      totalGatewayFeesRep += fxGateway;

      return {
        countryCode: code,
        countryName: COUNTRY_NAMES[code] || code,
        flag: COUNTRY_FLAGS[code] || '🌍',
        localCurrency: data.localCurr,
        localRevenue: Number(data.localRev.toFixed(2)),
        reportingRevenue: Number(fxRev.reportingAmount.toFixed(2)),
        reportingCost: Number(fxCost.reportingAmount.toFixed(2)),
        reportingProfit: Number(profit.toFixed(2)),
        marginPercent: margin,
        subscribersCount: data.count,
        requestsCount: data.requests,
      };
    });

    const grossProfitRep = DecimalMath.subtract(
      totalRevenueRep,
      DecimalMath.add(totalCostRep, totalGatewayFeesRep),
    );
    const grossMarginPercent =
      totalRevenueRep > 0
        ? Number(((grossProfitRep / totalRevenueRep) * 100).toFixed(1))
        : 0;

    const avgCostPerRequest =
      totalAiRequests > 0
        ? Number((totalCostRep / totalAiRequests).toFixed(5))
        : 0;
    const arpu =
      totalSubscribers > 0
        ? Number((totalRevenueRep / totalSubscribers).toFixed(2))
        : 0;

    // Breakdown By Plan from real data
    const planMap = new Map(plans.map((p) => [p.id, p]));
    const planSubCounts: Record<string, number> = {};
    subs.forEach((s) => {
      planSubCounts[s.plan_id] = (planSubCounts[s.plan_id] || 0) + 1;
    });

    const planRevenueMap: Record<string, number> = {};
    paidTxns.forEach((t) => {
      const origAmt = Number(t.final_amount || t.base_amount || 0);
      const origCurr = t.original_currency || 'INR';
      const conv = this.fxRateService.convert(origAmt, origCurr, repCurr).reportingAmount;
      planRevenueMap[t.plan_id] = DecimalMath.add(planRevenueMap[t.plan_id] || 0, conv);
    });

    const distinctPlanIds = Array.from(new Set([...Object.keys(planSubCounts), ...Object.keys(planRevenueMap)]));
    const byPlan = distinctPlanIds.map((pId) => {
      const rev = planRevenueMap[pId] || 0;
      const planCost = totalCostRep > 0 ? DecimalMath.percentage(totalCostRep, 10.0) : 0;
      const profit = DecimalMath.subtract(rev, planCost);
      const margin = rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0;
      return {
        planId: pId,
        planName: planMap.get(pId)?.name || pId.replace(/_/g, ' ').toUpperCase(),
        subscribers: planSubCounts[pId] || 0,
        reportingRevenue: Number(rev.toFixed(2)),
        reportingCost: Number(planCost.toFixed(2)),
        marginPercent: margin,
      };
    });

    // Breakdown By Model from real logs
    const modelGroupMap: Record<string, { requests: number; inputTokens: number; outputTokens: number; costUsd: number }> = {};
    logs.forEach((log) => {
      const m = log.model || 'gemini-1.5-flash';
      if (!modelGroupMap[m]) {
        modelGroupMap[m] = { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
      }
      modelGroupMap[m].requests += 1;
      modelGroupMap[m].inputTokens += log.input_tokens || 0;
      modelGroupMap[m].outputTokens += log.output_tokens || 0;
      modelGroupMap[m].costUsd += Number(log.estimated_cost_usd || 0);
    });

    const byModel = Object.entries(modelGroupMap).map(([model, mData]) => ({
      model,
      provider: model.includes('gemini') ? 'Google Gemini' : model.includes('gpt') ? 'OpenAI' : 'HealNari AI',
      requests: mData.requests,
      inputTokens: mData.inputTokens,
      outputTokens: mData.outputTokens,
      reportingCost: Number(this.fxRateService.convert(mData.costUsd, 'USD', repCurr).reportingAmount.toFixed(4)),
    }));

    // Breakdown By Feature from real logs
    const featureGroupMap: Record<string, { requests: number; creditsUsed: number; costUsd: number }> = {};
    logs.forEach((log) => {
      const f = log.feature || 'PATIENT_CHAT';
      if (!featureGroupMap[f]) {
        featureGroupMap[f] = { requests: 0, creditsUsed: 0, costUsd: 0 };
      }
      featureGroupMap[f].requests += 1;
      featureGroupMap[f].creditsUsed += log.credits_deducted || 1;
      featureGroupMap[f].costUsd += Number(log.estimated_cost_usd || 0);
    });

    const byFeature = Object.entries(featureGroupMap).map(([featureKey, fData]) => ({
      featureKey,
      featureName: featureKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      requests: fData.requests,
      creditsUsed: fData.creditsUsed,
      reportingCost: Number(this.fxRateService.convert(fData.costUsd, 'USD', repCurr).reportingAmount.toFixed(4)),
    }));

    return {
      reportingCurrency: repCurr,
      reportingCurrencySymbol: currSymbol,
      metrics: {
        totalRevenue: Number(totalRevenueRep.toFixed(2)),
        totalAiCost: Number(totalCostRep.toFixed(2)),
        totalGatewayFees: Number(totalGatewayFeesRep.toFixed(2)),
        grossProfit: Number(grossProfitRep.toFixed(2)),
        grossMarginPercent,
        totalActiveSubscribers: totalSubscribers,
        totalAiRequests,
        totalCreditsConsumed,
        avgCostPerRequest,
        arpu,
      },
      byCountry,
      byPlan,
      byModel,
      byFeature,
    };
  }
}
