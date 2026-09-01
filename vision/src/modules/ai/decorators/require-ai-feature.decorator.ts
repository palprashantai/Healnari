import { SetMetadata } from '@nestjs/common';
import { AiFeatureKey } from '@/modules/ai/interfaces/ai-monetization.interface';

export const AI_FEATURE_KEY = 'ai_feature_key';
export const RequireAiFeature = (feature: AiFeatureKey | string) =>
  SetMetadata(AI_FEATURE_KEY, feature);
