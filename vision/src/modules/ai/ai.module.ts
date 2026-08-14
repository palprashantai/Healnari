import { Module } from '@nestjs/common';
import { AiService } from '@/modules/ai/services/ai.service';
import { AiController } from '@/modules/ai/controllers/ai.controller';
import { ChatGateway } from '@/modules/ai/gateways/chat.gateway';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { PatientsModule } from '@/modules/patients/patients.module';

@Module({
  imports: [SupabaseModule, PatientsModule],
  controllers: [AiController],
  providers: [AiService, ChatGateway],
  exports: [AiService],
})
export class AiModule {}
