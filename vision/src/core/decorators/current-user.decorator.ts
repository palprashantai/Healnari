import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Profile } from '@/shared/interfaces/profile.interface';

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
}

/** Reads the caller identity SupabaseAuthGuard attached to the request. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
