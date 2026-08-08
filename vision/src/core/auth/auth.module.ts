import { Module } from '@nestjs/common';
import { AuthService } from '@/core/auth/auth.service';
import { AuthController } from '@/core/auth/auth.controller';
import { SupabaseModule } from '@/core/supabase/supabase.module';
import { SupabaseAuthGuard } from '@/core/guards/supabase-auth.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
