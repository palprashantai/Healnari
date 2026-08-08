import { Module } from '@nestjs/common';
import { TelemedicineService } from '@/modules/telemedicine/services/telemedicine.service';
import { TelemedicineController } from '@/modules/telemedicine/controllers/telemedicine.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [TelemedicineController],
  providers: [TelemedicineService],
})
export class TelemedicineModule {}
