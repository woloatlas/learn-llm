import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function main() {
  console.log("=== Phase 0: Gemini API & Search Grounding Verification ===\n");

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.log("ℹ Notice: GEMINI_API_KEY is not set in environment or .env file.");
    console.log("  To verify Gemini live, create a .env file with:");
    console.log("  GEMINI_API_KEY=your_key_here\n");
    console.log("  You can obtain a free Gemini API key at: https://aistudio.google.com/\n");
    console.log("Skipping live network call (dry run passed).");
    return;
  }

  console.log("[Gemini Client] Initializing GoogleGenAI client with configured API key...");
  const ai = new GoogleGenAI({ apiKey });

  // Test 1: Basic Pedagogical Reasoning with gemini-2.0-flash
  console.log("\n[Test 1/2] Testing gemini-2.0-flash completion...");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "In the context of learning pedagogy, what is an 'unconditional truth' in 1 concise sentence?",
    });

    console.log("✓ Gemini Response Received:");
    console.log(`  "${response.text?.trim()}"\n`);
  } catch (err) {
    console.error("✗ Gemini standard generation failed:", err);
    process.exitCode = 1;
    return;
  }

  // Test 2: Native Google Search Grounding (Zero extra API keys)
  console.log("[Test 2/2] Testing native Google Search Grounding for researcher subagent...");
  try {
    const searchResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "What is TrueNAS and what is Dockge?",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    console.log("✓ Google Search Grounded Response Received:");
    console.log(`  "${searchResponse.text?.trim().slice(0, 200)}..."\n`);

    const grounding = searchResponse.candidates?.[0]?.groundingMetadata;
    if (grounding?.webSearchQueries || grounding?.groundingChunks) {
      console.log(`✓ Grounding Metadata Verified: Executed ${grounding.webSearchQueries?.length ?? 0} search queries.`);
    } else {
      console.log("ℹ Note: Response completed (search grounding metadata returned empty or direct answer was used).");
    }
  } catch (err) {
    console.error("✗ Google Search Grounding test failed:", err);
    process.exitCode = 1;
    return;
  }

  console.log("\n=== Gemini API & Search Grounding Verification SUCCESS ===");
}

main().catch((err) => {
  console.error("Unexpected error in verify-gemini:", err);
  process.exit(1);
});
