import { Module, forwardRef } from '@nestjs/common';
import { AiService } from '@/modules/ai/services/ai.service';
import { AiFeatureFlagService } from '@/modules/ai/services/ai-feature-flag.service';
import { AiUsageService } from '@/modules/ai/services/ai-usage.service';
import { AiSubscriptionService } from '@/modules/ai/services/ai-subscription.service';
import { AiEntitlementService } from '@/modules/ai/services/ai-entitlement.service';
import { AiPromptService } from '@/modules/ai/services/ai-prompt.service';
import { AiAnalyticsService } from '@/modules/ai/services/ai-analytics.service';
import { AiContextBuilderService } from '@/modules/ai/services/ai-context-builder.service';
import { AiOrchestrator } from '@/modules/ai/services/ai-orchestrator.service';
import { GeminiProvider } from '@/modules/ai/providers/gemini.provider';
import { OpenAiProvider } from '@/modules/ai/providers/openai.provider';
import { AiProviderGateway } from '@/modules/ai/providers/ai-provider.gateway';
import { AiToolRegistry } from '@/modules/ai/tools/ai-tool.registry';
import { AiEntitlementGuard } from '@/modules/ai/guards/ai-entitlement.guard';
import { AiController } from '@/modules/ai/controllers/ai.controller';
import { AiSubscriptionController } from '@/modules/ai/controllers/ai-subscription.controller';
import { AiAdminController } from '@/modules/ai/controllers/ai-admin.controller';
import { ChatGateway } from '@/modules/ai/gateways/chat.gateway';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { PatientsModule } from '@/modules/patients/patients.module';
import { AppointmentsModule } from '@/modules/appointments/appointments.module';
import { RecordsModule } from '@/modules/records/records.module';
import { DoctorsModule } from '@/modules/doctors/doctors.module';
import { CashfreeModule } from '@/core/cashfree/cashfree.module';

@Module({
  imports: [
    SupabaseModule,
    PatientsModule,
    forwardRef(() => AppointmentsModule),
    RecordsModule,
    DoctorsModule,
    CashfreeModule,
  ],
  controllers: [AiController, AiSubscriptionController, AiAdminController],
  providers: [
    GeminiProvider,
    OpenAiProvider,
    AiProviderGateway,
    AiToolRegistry,
    AiContextBuilderService,
    AiOrchestrator,
    AiService,
    AiFeatureFlagService,
    AiUsageService,
    AiSubscriptionService,
    AiEntitlementService,
    AiPromptService,
    AiAnalyticsService,
    AiEntitlementGuard,
    ChatGateway,
  ],
  exports: [
    AiOrchestrator,
    AiService,
    AiFeatureFlagService,
    AiUsageService,
    AiSubscriptionService,
    AiEntitlementService,
    AiPromptService,
    AiAnalyticsService,
    AiToolRegistry,
    AiProviderGateway,
  ],
})
export class AiModule {}
