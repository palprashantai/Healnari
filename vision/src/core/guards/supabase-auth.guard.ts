import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '@/core/decorators/public.decorator';
import { SupabaseService } from '@/core/supabase/supabase.service';

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

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET as string) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', payload.sub).single();
    if (!profile) throw new UnauthorizedException('No profile for this account');

    request.user = { id: profile.id, email: payload.email as string, profile };
    return true;
  }
}
