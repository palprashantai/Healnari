import { Module } from '@nestjs/common';
import { AdminService } from '@/modules/admin/services/admin.service';
import { AdminCronService } from '@/modules/admin/services/admin-cron.service';
import { CronManagerService } from '@/modules/admin/services/cron-manager.service';
import { AdminController } from '@/modules/admin/controllers/admin.controller';
import { CronManagerController } from '@/modules/admin/controllers/cron-manager.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { CashfreeModule } from '@/core/cashfree/cashfree.module';
import { EmailModule } from '@/core/email/email.module';

import { AnalyticsService } from '@/modules/admin/services/analytics.service';

@Module({
  imports: [SupabaseModule, NotificationsModule, CashfreeModule, EmailModule],
  controllers: [AdminController, CronManagerController],
  providers: [AdminService, AnalyticsService, AdminCronService, CronManagerService],
  exports: [AdminService, AnalyticsService, CronManagerService],
})
export class AdminModule {}
