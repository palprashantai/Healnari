import { Module } from '@nestjs/common';
import { CommunicationsService } from '@/modules/communications/services/communications.service';
import { CommunicationsController } from '@/modules/communications/controllers/communications.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { EmailModule } from '@/core/email/email.module';

@Module({
  imports: [SupabaseModule, NotificationsModule, EmailModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
})
export class CommunicationsModule {}
