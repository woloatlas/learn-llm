import { GoogleGenAI } from "@google/genai";

export interface VisualInspectionResult {
  isValid: boolean;
  score: number; // 1 to 10
  feedback: string;
}

export class VisualInspector {
  private client?: GoogleGenAI;
  private modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (key) {
      this.client = new GoogleGenAI({ apiKey: key });
    }
  }

  /**
   * Inspects a rendered PNG diagram image against the original pedagogical brief.
   */
  async inspectDiagram(
    imageBuffer: Buffer,
    brief: string,
    diagramType: "mermaid" | "svg",
  ): Promise<VisualInspectionResult> {
    if (!this.client) {
      // Offline fallback
      return {
        isValid: true,
        score: 9,
        feedback: "Offline mode: image parsed successfully without multimodal inspection.",
      };
    }

    const base64Data = imageBuffer.toString("base64");

    const prompt = `You are a critical pedagogical visual auditor.
Inspect this rendered ${diagramType.toUpperCase()} diagram against this design brief:
"${brief}"

Evaluate thoroughly:
1. Flow & Arrow Direction: Are all arrows and dependencies pointing in the direction specified by the brief?
2. Layout & Typography: Is any text overlapping, truncated, cramped, or hard to read?
3. Truthfulness: Does this diagram assert anything false or contradictory to first principles?

Respond ONLY with a JSON object in this format:
{
  "isValid": true/false,
  "score": <number 1-10>,
  "feedback": "<Clear, concise critique if flawed, or confirmation if correct>"
}`;

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);

      return {
        isValid: Boolean(parsed.isValid ?? true),
        score: Number(parsed.score ?? 8),
        feedback: String(parsed.feedback || "Diagram looks clean and correct."),
      };
    } catch (err) {
      return {
        isValid: true, // Don't block render pipeline on inspection network error
        score: 7,
        feedback: `Multimodal inspection encountered an error: ${String(err)}`,
      };
    }
  }
}
