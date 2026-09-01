import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AI_FEATURE_KEY } from '@/modules/ai/decorators/require-ai-feature.decorator';
import { AiEntitlementService } from '@/modules/ai/services/ai-entitlement.service';

@Injectable()
export class AiEntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementService: AiEntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(AI_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featureKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return true; // SupabaseAuthGuard will handle unauthenticated
    }

    const entitlement = await this.entitlementService.enforceAccess(user, featureKey);
    request.aiEntitlement = entitlement;
    return true;
  }
}
