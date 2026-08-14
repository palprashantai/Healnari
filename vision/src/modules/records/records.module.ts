import { Module } from '@nestjs/common';
import { RecordsService } from '@/modules/records/services/records.service';
import { PrescriptionsCronService } from '@/modules/records/services/prescriptions-cron.service';
import { RecordsController } from '@/modules/records/controllers/records.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { EmailModule } from '@/core/email/email.module';

@Module({
  imports: [SupabaseModule, NotificationsModule, EmailModule],
  controllers: [RecordsController],
  providers: [RecordsService, PrescriptionsCronService],
})
export class RecordsModule {}
