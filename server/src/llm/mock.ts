import {
  type ILLMProvider,
  type ChatMessage,
  type ToolDeclaration,
  type LLMStreamChunk,
  type LLMResponse,
} from "./types.ts";

export type MockHandler = (
  messages: ChatMessage[],
  systemInstruction?: string,
  tools?: ToolDeclaration[],
) => Promise<LLMResponse> | LLMResponse;

export class MockLLMProvider implements ILLMProvider {
  private handler?: MockHandler;

  constructor(handler?: MockHandler) {
    this.handler = handler;
  }

  setHandler(handler: MockHandler) {
    this.handler = handler;
  }

  async *chatStream(
    messages: ChatMessage[],
    systemInstruction?: string,
    tools?: ToolDeclaration[],
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const res = await this.generate(messages, systemInstruction, tools);

    if (res.text) {
      // Simulate chunking
      const words = res.text.split(" ");
      for (let i = 0; i < words.length; i += 3) {
        const slice = words.slice(i, i + 3).join(" ") + " ";
        yield { type: "text", text: slice };
      }
    }

    if (res.toolCalls) {
      for (const tc of res.toolCalls) {
        yield { type: "tool_call", toolCall: tc };
      }
    }
  }

  async generate(
    messages: ChatMessage[],
    systemInstruction?: string,
    tools?: ToolDeclaration[],
  ): Promise<LLMResponse> {
    if (this.handler) {
      return this.handler(messages, systemInstruction, tools);
    }
    return {
      text: "Mock response.",
    };
  }
}
