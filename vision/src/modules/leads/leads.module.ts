import { Module } from '@nestjs/common';
import { LeadsService } from '@/modules/leads/services/leads.service';
import { LeadsController } from '@/modules/leads/controllers/leads.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
