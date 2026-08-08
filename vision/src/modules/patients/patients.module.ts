import { Module } from '@nestjs/common';
import { PatientsService } from '@/modules/patients/services/patients.service';
import { PatientsController } from '@/modules/patients/controllers/patients.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
