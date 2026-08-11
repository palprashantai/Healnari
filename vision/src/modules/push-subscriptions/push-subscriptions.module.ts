import { Module } from '@nestjs/common';
import { PushSubscriptionsService } from '@/modules/push-subscriptions/services/push-subscriptions.service';
import { PushSubscriptionsController } from '@/modules/push-subscriptions/controllers/push-subscriptions.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [PushSubscriptionsController],
  providers: [PushSubscriptionsService],
  exports: [PushSubscriptionsService],
})
export class PushSubscriptionsModule {}
