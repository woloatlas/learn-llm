import { GoogleGenAI } from "@google/genai";
import {
  type ILLMProvider,
  type ChatMessage,
  type ToolDeclaration,
  type LLMStreamChunk,
  type LLMResponse,
  type ToolCallData,
} from "./types.ts";

export interface GeminiConfig {
  apiKey?: string;
  model?: string;
}

export class GeminiProvider implements ILLMProvider {
  private client: GoogleGenAI;
  private defaultModel: string;

  constructor(config: GeminiConfig = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GeminiProvider requires an API key. Set GEMINI_API_KEY in .env or pass apiKey to constructor.",
      );
    }
    this.client = new GoogleGenAI({ apiKey });
    this.defaultModel =
      config.model || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  }

  /**
   * Converts internal ChatMessage array into the Gemini SDK Content format.
   */
  private formatContents(messages: ChatMessage[]) {
    return messages
      .filter((m) => m.role !== "system")
      .map((msg) => ({
        role: msg.role === "model" ? "model" : "user",
        parts: msg.parts.map((part) => {
          if ("text" in part) {
            return {
              text: part.text,
              ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
              ...(part.thought !== undefined ? { thought: part.thought } : {}),
            };
          }
          if ("functionCall" in part) {
            return {
              functionCall: part.functionCall,
              ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
            };
          }
          if ("functionResponse" in part) {
            return {
              functionResponse: part.functionResponse,
            };
          }
          if ("inlineData" in part) return { inlineData: part.inlineData };
          return part;
        }),
      }));
  }

  private async executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;

        // Auto-fallback from low-quota models to high-quota gemini-3.5-flash-lite
        const isQuotaExhausted =
          (err?.status === 429 || String(err).includes("429")) &&
          (String(err).includes("RESOURCE_EXHAUSTED") || String(err).includes("Quota exceeded"));
        if (isQuotaExhausted && this.defaultModel !== "gemini-3.5-flash-lite") {
          console.warn(
            `[GeminiProvider] Quota reached for ${this.defaultModel}. Automatically falling back to high-quota gemini-3.5-flash-lite.`
          );
          this.defaultModel = "gemini-3.5-flash-lite";
          continue;
        }

        const isTransient =
          err?.status === 503 ||
          String(err).includes("503") ||
          String(err).includes("UNAVAILABLE");
        if (isTransient && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  /**
   * Streams chat completions, yielding text chunks and tool call events.
   */
  async *chatStream(
    messages: ChatMessage[],
    systemInstruction?: string,
    tools?: ToolDeclaration[],
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const contents = this.formatContents(messages);

    const config: Record<string, unknown> = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (tools && tools.length > 0) {
      config.tools = tools;
    }

    const responseStream = await this.executeWithRetry(() =>
      this.client.models.generateContentStream({
        model: this.defaultModel,
        contents,
        config,
      }),
    );

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (parts && parts.length > 0) {
        for (const p of parts) {
          if (p.functionCall) {
            yield {
              type: "tool_call",
              toolCall: {
                name: p.functionCall.name,
                args: (p.functionCall.args as Record<string, unknown>) || {},
                id: (p.functionCall as any).id,
                thoughtSignature: p.thoughtSignature,
              },
            };
          } else if (p.text) {
            yield {
              type: "text",
              text: p.text,
              thoughtSignature: p.thoughtSignature,
            };
          }
        }
      } else {
        // Fallback for text-only chunks
        if (chunk.text) {
          yield { type: "text", text: chunk.text };
        }
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (const call of chunk.functionCalls) {
            yield {
              type: "tool_call",
              toolCall: {
                name: call.name,
                args: (call.args as Record<string, unknown>) || {},
              },
            };
          }
        }
      }
    }
  }

  /**
   * Non-streaming completion call.
   */
  async generate(
    messages: ChatMessage[],
    systemInstruction?: string,
    tools?: ToolDeclaration[],
  ): Promise<LLMResponse> {
    const contents = this.formatContents(messages);

    const config: Record<string, unknown> = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (tools && tools.length > 0) {
      config.tools = tools;
    }

    const response = await this.executeWithRetry(() =>
      this.client.models.generateContent({
        model: this.defaultModel,
        contents,
        config,
      }),
    );

    const parts = response.candidates?.[0]?.content?.parts || [];
    const toolCalls: ToolCallData[] = [];
    for (const p of parts) {
      if (p.functionCall) {
        toolCalls.push({
          name: p.functionCall.name,
          args: (p.functionCall.args as Record<string, unknown>) || {},
          id: (p.functionCall as any).id,
          thoughtSignature: p.thoughtSignature,
        });
      }
    }

    return {
      text: response.text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}
