import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/core/decorators/public.decorator';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';

/** Verifies the Supabase-issued access token on every request and resolves
 * the caller's `profiles` row — vision's sole source of truth for identity
 * and role, since it's the only backend that ever talks to the database. */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const { data: userResponse, error } = await this.supabase.anon.auth.getUser(token);
    if (error || !userResponse?.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', userResponse.user.id).single();
    if (!profile) throw new UnauthorizedException('No profile for this account');
    // AUDIT_REPORT.md DB-9 — confirmed this guard resolves the profile fresh
    // on every request (not just at login), so this is the one place a
    // suspension actually needs to be enforced — a still-valid JWT for a
    // just-suspended account is otherwise usable until natural expiry.
    if (profile.status === 'Suspended') throw new ForbiddenException(ERROR_MESSAGES.ACCOUNT_SUSPENDED);

    request.user = { id: profile.id, email: userResponse.user.email, profile };
    return true;
  }
}
