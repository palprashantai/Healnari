import { Module } from '@nestjs/common';
import { BillingService } from '@/modules/billing/services/billing.service';
import { InvoiceService } from '@/modules/billing/services/invoice.service';
import { BillingCronService } from '@/modules/billing/services/billing-cron.service';
import { BillingController } from '@/modules/billing/controllers/billing.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { CashfreeModule } from '@/core/cashfree/cashfree.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { EmailModule } from '@/core/email/email.module';

import { AppointmentsModule } from '@/modules/appointments/appointments.module';
import { AiModule } from '@/modules/ai/ai.module';

@Module({
  imports: [
    SupabaseModule,
    CashfreeModule,
    NotificationsModule,
    EmailModule,
    AppointmentsModule,
    AiModule,
  ],
  controllers: [BillingController],
  providers: [BillingService, InvoiceService, BillingCronService],
  exports: [BillingService],
})
export class BillingModule {}
