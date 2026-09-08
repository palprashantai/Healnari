import { Global, Module } from '@nestjs/common';
import { CronLockService } from './cron-lock.service';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Global()
@Module({
  imports: [SupabaseModule],
  providers: [CronLockService],
  exports: [CronLockService],
})
export class SchedulerModule {}
