import { Module, Global } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Global()
@Module({
  imports: [SupabaseModule],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
