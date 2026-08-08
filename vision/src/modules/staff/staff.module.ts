import { Module } from '@nestjs/common';
import { StaffService } from '@/modules/staff/services/staff.service';
import { StaffController } from '@/modules/staff/controllers/staff.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
