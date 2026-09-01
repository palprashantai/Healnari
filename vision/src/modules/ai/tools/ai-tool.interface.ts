import { FunctionDeclaration } from '@google/generative-ai';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { AiFeatureKey } from '../interfaces/ai-monetization.interface';

export interface AIExecutionContext {
  user: AuthUser | null;
  role: ProfileRole | 'visitor';
  isDoctorVerified?: boolean;
  sessionId?: string;
  requestId?: string;
}

export interface AITool<TParams = any, TResult = any> {
  name: string;
  description: string;
  parameters: FunctionDeclaration['parameters'];
  requiredRole?: ProfileRole | 'any';
  requiredEntitlement?: AiFeatureKey;
  requiresDoctorVerification?: boolean;

  execute(params: TParams, context: AIExecutionContext): Promise<TResult>;
}
