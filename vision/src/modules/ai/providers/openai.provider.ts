import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import {
  IAiProvider,
  AiChatMessage,
  AiModelOptions,
  AiModelResponse,
  AiToolCall,
} from './ai-provider.interface';

@Injectable()
export class OpenAiProvider implements IAiProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiProvider.name);
  private openai: OpenAI | null = null;
  private defaultModel = 'gpt-4o-mini';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY is not set. OpenAiProvider will operate in offline/fallback mode.');
    }
  }

  isAvailable(): boolean {
    return !!this.openai;
  }

  async generateText(prompt: string, options?: AiModelOptions): Promise<AiModelResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API is not configured.');
    }

    const modelName = options?.model || this.defaultModel;
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options?.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await this.openai.chat.completions.create({
      model: modelName,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens,
      response_format:
        options?.responseMimeType === 'application/json'
          ? { type: 'json_object' }
          : undefined,
    });

    const choice = completion.choices[0];
    const text = choice?.message?.content || '';

    return {
      text,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
  }

  async chat(
    messages: AiChatMessage[],
    options?: AiModelOptions,
  ): Promise<AiModelResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API is not configured.');
    }

    const modelName = options?.model || this.defaultModel;
    const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (options?.systemInstruction) {
      formattedMessages.push({ role: 'system', content: options.systemInstruction });
    }

    for (const m of messages) {
      if (m.role === 'tool' || m.role === 'function') {
        formattedMessages.push({
          role: 'tool',
          tool_call_id: m.name || 'tool_call',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        });
      } else if (m.role === 'assistant' || m.role === 'model') {
        formattedMessages.push({
          role: 'assistant',
          content: m.content || '',
          tool_calls: m.toolCalls?.map((tc, idx) => ({
            id: tc.id || `call_${idx}`,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            },
          })),
        });
      } else {
        formattedMessages.push({
          role: 'user',
          content: m.content,
        });
      }
    }

    const tools: OpenAI.Chat.ChatCompletionTool[] | undefined = options?.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters as unknown as Record<string, unknown>,
      },
    }));

    const completion = await this.openai.chat.completions.create({
      model: modelName,
      messages: formattedMessages,
      tools: tools?.length ? tools : undefined,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens,
    });

    const choice = completion.choices[0];
    const rawToolCalls = choice?.message?.tool_calls;

    const toolCalls: AiToolCall[] = (rawToolCalls || []).map((tc: any) => {
      let args = {};
      try {
        args = JSON.parse(tc.function?.arguments || '{}');
      } catch {
        args = { raw: tc.function?.arguments };
      }
      return {
        id: tc.id,
        name: tc.function?.name || 'tool',
        args,
      };
    });

    return {
      text: choice?.message?.content || '',
      toolCalls: toolCalls.length ? toolCalls : undefined,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.openai) {
      return [];
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (err) {
      this.logger.error('OpenAI embedding failed', err);
      return [];
    }
  }
}
