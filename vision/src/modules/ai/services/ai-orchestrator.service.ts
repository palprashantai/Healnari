import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AiProviderGateway } from '../providers/ai-provider.gateway';
import { AiToolRegistry } from '../tools/ai-tool.registry';
import { AiContextBuilderService } from './ai-context-builder.service';
import { AiEntitlementService, PaymentRequiredException } from './ai-entitlement.service';
import { AiSubscriptionService } from './ai-subscription.service';
import { AiUsageService } from './ai-usage.service';
import { AiAnalyticsService } from './ai-analytics.service';
import { AiPromptService } from './ai-prompt.service';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import {
  AiChatMessage,
  AiToolCall,
} from '../providers/ai-provider.interface';
import { AiFeatureKey } from '../interfaces/ai-monetization.interface';
import { AIExecutionContext } from '../tools/ai-tool.interface';

export interface OrchestrateChatParams {
  message: string;
  history?: AiChatMessage[];
  user: AuthUser | null;
  featureKey?: AiFeatureKey;
  preferredProvider?: 'gemini' | 'openai';
  onEvent?: (event: {
    type: 'tool_start' | 'tool_finish' | 'content';
    toolName?: string;
    data?: any;
  }) => void;
}

export interface OrchestrateChatResult {
  reply: string;
  history: AiChatMessage[];
  toolsExecuted: string[];
  tokensUsed: number;
  estimatedCostUsd: number;
  creditsRemaining?: number;
  requestId: string;
}

@Injectable()
export class AiOrchestrator {
  private readonly logger = new Logger(AiOrchestrator.name);

  constructor(
    private readonly providerGateway: AiProviderGateway,
    private readonly toolRegistry: AiToolRegistry,
    private readonly contextBuilder: AiContextBuilderService,
    private readonly entitlementService: AiEntitlementService,
    private readonly subscriptionService: AiSubscriptionService,
    private readonly usageService: AiUsageService,
    private readonly analyticsService: AiAnalyticsService,
    private readonly promptService: AiPromptService,
  ) {}

  /**
   * Central Orchestration Pipeline for All HealNari AI Operations.
   */
  async processChat(params: OrchestrateChatParams): Promise<OrchestrateChatResult> {
    const startTime = Date.now();
    const requestId = `req_${randomUUID()}`;
    const { message, user, preferredProvider, onEvent } = params;

    // 1. Role & Identity Resolution
    const role: ProfileRole | 'visitor' = user?.profile?.role || 'visitor';
    const isDoctorVerified = user?.profile?.role === ProfileRole.DOCTOR && !!user.profile.kyc_verified;
    const executionContext: AIExecutionContext = {
      user,
      role,
      isDoctorVerified,
      requestId,
    };

    // 2. Feature Key Resolution & Entitlement Check
    const featureKey =
      params.featureKey ||
      (role === ProfileRole.DOCTOR
        ? AiFeatureKey.DOCTOR_PATIENT_BRIEF
        : AiFeatureKey.PATIENT_CHAT);

    if (user) {
      const entitlement = await this.entitlementService.checkAccess(
        user,
        featureKey,
      );

      if (!entitlement.hasAccess) {
        // Track paywall event
        this.analyticsService.track({
          event_type: 'AI_LIMIT_REACHED',
          user_id: user.id,
          role,
          feature: featureKey,
          metadata: { reason: entitlement.reason },
        });

        throw new PaymentRequiredException({
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'Payment Required',
          message: entitlement.reason || 'AI credit allowance reached for current billing cycle.',
          paywallData: entitlement.paywallData,
        });
      }
    }

    // 3. Provider & Tools Selection
    const provider = this.providerGateway.getProvider(preferredProvider);
    const availableTools = this.toolRegistry.getAvailableTools(executionContext);
    const systemInstruction = this.contextBuilder.buildSystemInstruction(executionContext);

    // 4. Conversation History Formatting
    const messages: AiChatMessage[] = [...(params.history || [])];
    messages.push({ role: 'user', content: message });

    // 5. Multi-Turn Tool Execution Loop (up to 4 turns)
    let turns = 0;
    const maxTurns = 4;
    const toolsExecuted: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalReply = '';

    while (turns < maxTurns) {
      turns++;

      const modelResponse = await provider.chat(messages, {
        systemInstruction,
        tools: availableTools,
        temperature: 0.3,
      });

      totalInputTokens += modelResponse.inputTokens || 0;
      totalOutputTokens += modelResponse.outputTokens || 0;

      // Check if model requested tool executions
      if (modelResponse.toolCalls && modelResponse.toolCalls.length > 0) {
        // Append assistant's tool-call request to messages
        messages.push({
          role: 'model',
          content: modelResponse.text || '',
          toolCalls: modelResponse.toolCalls,
        });

        // Execute each tool in sequence
        for (const toolCall of modelResponse.toolCalls) {
          toolsExecuted.push(toolCall.name);
          onEvent?.({
            type: 'tool_start',
            toolName: toolCall.name,
            data: toolCall.args,
          });

          this.logger.log(`[${requestId}] Tool executing: ${toolCall.name}`);
          const toolResult = await this.toolRegistry.executeTool(
            toolCall.name,
            toolCall.args,
            executionContext,
          );

          onEvent?.({
            type: 'tool_finish',
            toolName: toolCall.name,
            data: toolResult,
          });

          // Append tool result back into conversation
          messages.push({
            role: 'tool',
            name: toolCall.name,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          });
        }
      } else {
        // Final text response reached
        finalReply = modelResponse.text;
        messages.push({ role: 'model', content: finalReply });
        break;
      }
    }

    if (!finalReply && turns >= maxTurns) {
      finalReply = 'I have processed your request with the relevant health records. Please let me know if you need more details.';
      messages.push({ role: 'model', content: finalReply });
    }

    const durationMs = Date.now() - startTime;
    const estimatedCostUsd = this.usageService.calculateCostUsd(
      provider.name,
      totalInputTokens,
      totalOutputTokens,
    );

    // 6. Record Usage, Costs, and Analytics
    let creditsRemaining: number | undefined;
    if (user) {
      await this.usageService.logUsage({
        user_id: user.id,
        role,
        feature: featureKey,
        model: provider.name,
        input_tokens: Math.round(totalInputTokens),
        output_tokens: Math.round(totalOutputTokens),
        duration_ms: durationMs,
        metadata: {
          requestId,
          toolsExecuted,
          turns,
        },
      });

      // Deduct credit
      const sub = await this.subscriptionService.deductCredits(user, 1);
      if (sub) {
        creditsRemaining = Math.max(0, (sub.monthly_ai_credits || 5) - (sub.credits_used || 0));
      }

      this.analyticsService.track({
        event_type: 'AI_COMPLETED',
        user_id: user.id,
        role,
        feature: featureKey,
        metadata: {
          toolsExecuted,
          durationMs,
          tokensUsed: Math.round(totalInputTokens + totalOutputTokens),
          costUsd: estimatedCostUsd,
        },
      });
    }

    return {
      reply: finalReply,
      history: messages,
      toolsExecuted,
      tokensUsed: Math.round(totalInputTokens + totalOutputTokens),
      estimatedCostUsd,
      creditsRemaining,
      requestId,
    };
  }
}
