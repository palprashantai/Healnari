import { Module } from '@nestjs/common';
import { AdminService } from '@/modules/admin/services/admin.service';
import { AdminController } from '@/modules/admin/controllers/admin.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { CashfreeModule } from '@/core/cashfree/cashfree.module';

@Module({
  imports: [SupabaseModule, NotificationsModule, CashfreeModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
