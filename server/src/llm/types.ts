export type Role = "user" | "model" | "system";

export interface TextPart {
  text: string;
  thought?: boolean;
  thoughtSignature?: string;
}

export interface FunctionCallPart {
  functionCall: {
    name: string;
    args: Record<string, unknown>;
    id?: string;
  };
  thoughtSignature?: string;
}

export interface FunctionResponsePart {
  functionResponse: {
    name: string;
    response: Record<string, unknown>;
    id?: string;
  };
}

export interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string; // base64
  };
}

export type Part = TextPart | FunctionCallPart | FunctionResponsePart | ImagePart;

export interface ChatMessage {
  role: Role;
  parts: Part[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ToolDeclaration {
  functionDeclarations?: FunctionDeclaration[];
  googleSearch?: Record<string, unknown>;
}

export interface ToolCallData {
  name: string;
  args: Record<string, unknown>;
  id?: string;
  thoughtSignature?: string;
}

export type LLMStreamChunk =
  | { type: "text"; text: string; thoughtSignature?: string }
  | { type: "tool_call"; toolCall: ToolCallData };

export interface LLMResponse {
  text?: string;
  toolCalls?: ToolCallData[];
}

export interface ILLMProvider {
  chatStream(
    messages: ChatMessage[],
    systemInstruction?: string,
    tools?: ToolDeclaration[],
  ): AsyncGenerator<LLMStreamChunk, void, unknown>;

  generate(
    messages: ChatMessage[],
    systemInstruction?: string,
    tools?: ToolDeclaration[],
  ): Promise<LLMResponse>;
}
