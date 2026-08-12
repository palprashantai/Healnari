import { Module } from '@nestjs/common';
import { BillingService } from '@/modules/billing/services/billing.service';
import { InvoiceService } from '@/modules/billing/services/invoice.service';
import { BillingController } from '@/modules/billing/controllers/billing.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { CashfreeModule } from '@/core/cashfree/cashfree.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { EmailModule } from '@/core/email/email.module';

@Module({
  imports: [SupabaseModule, CashfreeModule, NotificationsModule, EmailModule],
  controllers: [BillingController],
  providers: [BillingService, InvoiceService],
})
export class BillingModule {}
