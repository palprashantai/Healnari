import { Module } from '@nestjs/common';
import { DoctorsService } from '@/modules/doctors/services/doctors.service';
import { DoctorsCronService } from '@/modules/doctors/services/doctors-cron.service';
import { DoctorsController } from '@/modules/doctors/controllers/doctors.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { EmailModule } from '@/core/email/email.module';

@Module({
  imports: [SupabaseModule, NotificationsModule, EmailModule],
  controllers: [DoctorsController],
  providers: [DoctorsService, DoctorsCronService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
