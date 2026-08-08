import { Module } from '@nestjs/common';
import { AppointmentsService } from '@/modules/appointments/services/appointments.service';
import { AppointmentsController } from '@/modules/appointments/controllers/appointments.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
