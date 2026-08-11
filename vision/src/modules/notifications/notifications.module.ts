import { Module } from '@nestjs/common';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';
import { NotificationsController } from '@/modules/notifications/controllers/notifications.controller';
import { NotificationsGateway } from '@/modules/notifications/gateways/notifications.gateway';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
