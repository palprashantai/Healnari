import { Module } from '@nestjs/common';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { NotificationsController } from '@/modules/notifications/controllers/notifications.controller';
import { NotificationsGateway } from '@/modules/notifications/gateways/notifications.gateway';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { PushSubscriptionsModule } from '@/modules/push-subscriptions/push-subscriptions.module';

@Module({
  imports: [SupabaseModule, PushSubscriptionsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
