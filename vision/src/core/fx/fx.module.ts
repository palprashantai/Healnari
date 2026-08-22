import { Global, Module } from '@nestjs/common';
import { FXRateService } from './fx-rate.service';

@Global()
@Module({
  providers: [FXRateService],
  exports: [FXRateService],
})
export class FXModule {}
