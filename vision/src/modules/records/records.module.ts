import { Module } from '@nestjs/common';
import { RecordsService } from '@/modules/records/services/records.service';
import { RecordsController } from '@/modules/records/controllers/records.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [SupabaseModule, NotificationsModule],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}
