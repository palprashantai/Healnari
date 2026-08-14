import { Module } from '@nestjs/common';
import { EmailService } from '@/core/email/email.service';
import { SupabaseModule } from '@/core/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
