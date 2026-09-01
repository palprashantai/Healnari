import { Injectable, Logger } from '@nestjs/common';
import {
  GoogleGenerativeAI,
  Content,
  FunctionDeclaration,
} from '@google/generative-ai';
import {
  IAiProvider,
  AiChatMessage,
  AiModelOptions,
  AiModelResponse,
  AiToolCall,
} from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements IAiProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private genAI: GoogleGenerativeAI | null = null;
  private defaultModel = 'gemini-1.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY is not set. GeminiProvider will operate in offline/fallback mode.');
    }
  }

  isAvailable(): boolean {
    return !!this.genAI;
  }

  async generateText(prompt: string, options?: AiModelOptions): Promise<AiModelResponse> {
    if (!this.genAI) {
      throw new Error('Gemini API is not configured.');
    }

    const modelName = options?.model || this.defaultModel;
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens,
        responseMimeType: options?.responseMimeType,
      },
      systemInstruction: options?.systemInstruction,
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return {
      text,
      inputTokens: prompt.length / 4,
      outputTokens: text.length / 4,
    };
  }

  async chat(
    messages: AiChatMessage[],
    options?: AiModelOptions,
  ): Promise<AiModelResponse> {
    if (!this.genAI) {
      throw new Error('Gemini API is not configured.');
    }

    const modelName = options?.model || this.defaultModel;
    const toolsConfig = options?.tools?.length
      ? [
          {
            functionDeclarations: options.tools as FunctionDeclaration[],
          },
        ]
      : undefined;

    const model = this.genAI.getGenerativeModel({
      model: modelName,
      tools: toolsConfig,
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens,
        responseMimeType: options?.responseMimeType,
      },
      systemInstruction: options?.systemInstruction,
    });

    // Convert messages to Gemini Content format
    const contents: Content[] = messages.map((m) => {
      if (m.role === 'tool' || m.role === 'function') {
        return {
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: m.name || 'tool',
                response: typeof m.content === 'string' ? JSON.parse(m.content) : m.content,
              },
            },
          ],
        };
      }

      if (m.toolCalls && m.toolCalls.length > 0) {
        return {
          role: 'model',
          parts: m.toolCalls.map((tc) => ({
            functionCall: {
              name: tc.name,
              args: tc.args,
            },
          })),
        };
      }

      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      };
    });

    const result = await model.generateContent({ contents });
    const response = result.response;
    const rawFunctionCalls = response.functionCalls();

    const toolCalls: AiToolCall[] = (rawFunctionCalls || []).map((fc) => ({
      name: fc.name,
      args: fc.args,
    }));

    let text = '';
    try {
      text = response.text();
    } catch {
      // If the model solely generated function calls without conversational text
      text = '';
    }

    return {
      text,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      inputTokens: JSON.stringify(messages).length / 4,
      outputTokens: (text.length + JSON.stringify(toolCalls).length) / 4,
    };
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.genAI) {
      return [];
    }

    try {
      const embedModel = this.genAI.getGenerativeModel({
        model: 'text-embedding-004',
      });
      const res = await embedModel.embedContent(text);
      return res.embedding.values;
    } catch (err) {
      this.logger.error('Gemini embedding failed', err);
      return [];
    }
  }
}
