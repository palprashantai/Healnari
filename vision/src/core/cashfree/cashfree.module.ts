import { Module } from '@nestjs/common';
import { CashfreeService } from '@/core/cashfree/cashfree.service';

@Module({
  providers: [CashfreeService],
  exports: [CashfreeService],
})
export class CashfreeModule {}
