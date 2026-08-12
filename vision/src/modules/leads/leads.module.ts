import { Module } from '@nestjs/common';
import { LeadsService } from '@/modules/leads/services/leads.service';
import { LeadsController } from '@/modules/leads/controllers/leads.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { EmailModule } from '@/core/email/email.module';

@Module({
  imports: [SupabaseModule, NotificationsModule, EmailModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
