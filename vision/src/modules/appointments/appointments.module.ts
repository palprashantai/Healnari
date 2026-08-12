import { Module } from '@nestjs/common';
import { AppointmentsService } from '@/modules/appointments/services/appointments.service';
import { AppointmentsController } from '@/modules/appointments/controllers/appointments.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { AiModule } from '@/modules/ai/ai.module';

@Module({
  imports: [SupabaseModule, NotificationsModule, AiModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
