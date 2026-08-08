import { Module } from '@nestjs/common';
import { AiService } from '@/modules/ai/services/ai.service';
import { ChatGateway } from '@/modules/ai/gateways/chat.gateway';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [AiService, ChatGateway],
  exports: [AiService],
})
export class AiModule {}
