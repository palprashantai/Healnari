import { Module } from '@nestjs/common';
import { DoctorsService } from '@/modules/doctors/services/doctors.service';
import { DoctorsController } from '@/modules/doctors/controllers/doctors.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
})
export class DoctorsModule {}
