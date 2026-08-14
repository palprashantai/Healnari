import { Module } from '@nestjs/common';
import { PatientsService } from '@/modules/patients/services/patients.service';
import { CyclePredictionCronService } from '@/modules/patients/services/cycle-prediction-cron.service';
import { PatientsController } from '@/modules/patients/controllers/patients.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [SupabaseModule, NotificationsModule],
  controllers: [PatientsController],
  providers: [PatientsService, CyclePredictionCronService],
  exports: [PatientsService],
})
export class PatientsModule {}
