import { FunctionDeclaration } from '@google/generative-ai';

export interface AiChatMessage {
  role: 'user' | 'model' | 'assistant' | 'system' | 'function' | 'tool';
  content: string;
  name?: string;
  toolCalls?: AiToolCall[];
}

export interface AiToolDeclaration {
  name: string;
  description: string;
  parameters: FunctionDeclaration['parameters'];
}

export interface AiToolCall {
  id?: string;
  name: string;
  args: Record<string, any>;
}

export interface AiToolResult {
  toolCallId?: string;
  name: string;
  result: any;
}

export interface AiModelOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  tools?: AiToolDeclaration[];
  responseMimeType?: 'text/plain' | 'application/json';
}

export interface AiModelResponse {
  text: string;
  toolCalls?: AiToolCall[];
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
}

export interface AiStreamChunk {
  type: 'content' | 'tool_call' | 'tool_executing' | 'tool_result' | 'done' | 'error';
  text?: string;
  toolCall?: AiToolCall;
  toolResult?: any;
  error?: string;
}

export interface IAiProvider {
  readonly name: string;
  isAvailable(): boolean;
  generateText(prompt: string, options?: AiModelOptions): Promise<AiModelResponse>;
  chat(
    messages: AiChatMessage[],
    options?: AiModelOptions,
  ): Promise<AiModelResponse>;
  embedText(text: string): Promise<number[]>;
}
