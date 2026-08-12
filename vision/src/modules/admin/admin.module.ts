import { Module } from '@nestjs/common';
import { AdminService } from '@/modules/admin/services/admin.service';
import { AdminController } from '@/modules/admin/controllers/admin.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [SupabaseModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
