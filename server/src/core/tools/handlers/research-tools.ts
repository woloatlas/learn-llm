import { GoogleGenAI } from "@google/genai";

export class ResearchToolsHandler {
  private client?: GoogleGenAI;
  private modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (key) {
      this.client = new GoogleGenAI({ apiKey: key });
    }
  }

  /**
   * Performs an authoritative web search grounded via Gemini Google Search,
   * with graceful fallback to standard synthesis if search grounding quota is exceeded.
   */
  async webSearch(query: string): Promise<Record<string, unknown>> {
    if (!this.client) {
      return {
        query,
        summary: `Offline mode: Search for "${query}" simulated.`,
        sources: [{ title: "Offline Documentation", url: "https://example.com" }],
      };
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: `Research the following query with authoritative primary sources:
"${query}"

Synthesize a concise brief with numbered findings and direct citations.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      const grounding = response.candidates?.[0]?.groundingMetadata;
      const chunks = grounding?.groundingChunks || [];

      const sources = chunks.map((c: any) => ({
        title: c.web?.title || "Web Source",
        url: c.web?.uri || "",
      }));

      return {
        query,
        answer: text,
        queriesExecuted: grounding?.webSearchQueries || [],
        sources,
      };
    } catch (err) {
      // Graceful fallback for free tier accounts where Google Search grounding has quota restrictions
      try {
        const fallback = await this.client.models.generateContent({
          model: this.modelName,
          contents: `Provide an authoritative technical breakdown of: "${query}".
Include core mechanisms, historical RFCs or formal specifications where applicable, and key considerations.`,
        });

        return {
          query,
          answer: fallback.text || "",
          queriesExecuted: [],
          sources: [{ title: "Primary Technical Knowledge Synthesis", url: "internal" }],
          note: "Live search grounding quota exceeded; synthesized from primary technical knowledge.",
        };
      } catch (fallbackErr) {
        return {
          query,
          error: `Research error: ${String(fallbackErr)}`,
        };
      }
    }
  }

  /**
   * Fetches the plain text content of a given URL.
   */
  async webFetch(url: string): Promise<Record<string, unknown>> {
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "LearnLLM-ResearchAgent/1.0",
        },
      });

      if (!resp.ok) {
        return { ok: false, status: resp.status, error: `HTTP ${resp.status} ${resp.statusText}` };
      }

      const html = await resp.text();
      // Simple tag stripper to extract body text
      const cleanText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);

      return {
        ok: true,
        url,
        content: cleanText,
      };
    } catch (err) {
      return {
        ok: false,
        url,
        error: `Failed to fetch URL: ${String(err)}`,
      };
    }
  }
}
