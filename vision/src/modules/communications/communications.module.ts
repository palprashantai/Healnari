import { Module } from '@nestjs/common';
import { CommunicationsService } from '@/modules/communications/services/communications.service';
import { CommunicationsController } from '@/modules/communications/controllers/communications.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
})
export class CommunicationsModule {}
