import { Module } from '@nestjs/common';
import { BillingService } from '@/modules/billing/services/billing.service';
import { BillingController } from '@/modules/billing/controllers/billing.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
