import { Module } from '@nestjs/common';
import { AdminService } from '@/modules/admin/services/admin.service';
import { AdminController } from '@/modules/admin/controllers/admin.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
