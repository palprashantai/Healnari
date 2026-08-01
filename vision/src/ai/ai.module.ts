import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatController } from './chat.controller';

@Module({
  providers: [AiService],
  controllers: [ChatController],
  exports: [AiService],
})
export class AiModule {}
