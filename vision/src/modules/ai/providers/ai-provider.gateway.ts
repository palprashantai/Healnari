import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { OpenAiProvider } from './openai.provider';
import { IAiProvider } from './ai-provider.interface';

@Injectable()
export class AiProviderGateway {
  private readonly logger = new Logger(AiProviderGateway.name);

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly openAiProvider: OpenAiProvider,
  ) {}

  getProvider(preferred?: 'gemini' | 'openai'): IAiProvider {
    if (preferred === 'openai' && this.openAiProvider.isAvailable()) {
      return this.openAiProvider;
    }
    if (preferred === 'gemini' && this.geminiProvider.isAvailable()) {
      return this.geminiProvider;
    }

    // Default preference: Gemini -> OpenAI
    if (this.geminiProvider.isAvailable()) {
      return this.geminiProvider;
    }
    if (this.openAiProvider.isAvailable()) {
      return this.openAiProvider;
    }

    // Return Gemini provider as fallback (which will log appropriate warnings)
    return this.geminiProvider;
  }
}
