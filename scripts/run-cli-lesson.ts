import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import "dotenv/config";
import { GeminiProvider } from "../server/src/llm/gemini.ts";
import { MockLLMProvider } from "../server/src/llm/mock.ts";
import { AgentRegistry } from "../server/src/core/agents/registry.ts";
import { SubagentRunner } from "../server/src/core/agents/runner.ts";
import { TeachingSession } from "../server/src/core/engine/session.ts";
import { type ILLMProvider } from "../server/src/llm/types.ts";

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log("==================================================");
  console.log("    LEARN-LLM: SOCRATIC TEACHING ENGINE CLI       ");
  console.log("==================================================\n");

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let llm: ILLMProvider;

  if (apiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    console.log(`✓ Connected to Google Gemini (${model})\n`);
    llm = new GeminiProvider({ apiKey, model });
  } else {
    console.log("ℹ No GEMINI_API_KEY found in .env; running in Interactive Mock Mode.");
    console.log("  (To run with live Gemini, add GEMINI_API_KEY=your_key to your .env file)\n");

    llm = new MockLLMProvider(async (messages) => {
      const lastMsg = messages[messages.length - 1];
      const text = lastMsg.parts[0] && "text" in lastMsg.parts[0] ? lastMsg.parts[0].text : "";

      if (messages.length <= 1) {
        return {
          text: `Great choice! To teach ${text} effectively, we must start from foundations.\nFirst, let's bracket where your current understanding ends:`,
          toolCalls: [
            {
              name: "quiz",
              args: {
                question: `Which of the following represents an unconditional truth about ${text}?`,
                options: [
                  { label: "It operates strictly on discrete mathematical principles", value: "math" },
                  { label: "It works mostly by probabilistic guesswork with no guarantees", value: "guess" },
                ],
                correctAnswer: "math",
                explanation: "Foundational concepts rest on deterministic, verifiable rules before nuance is added.",
              },
            },
          ],
        };
      }

      return {
        text: `Now that we locked in that foundation, let's establish the motivated discovery path...`,
      };
    });
  }

  const registry = new AgentRegistry();
  const subagents = new SubagentRunner(registry, llm);

  const topic = process.argv.slice(2).join(" ") || (await rl.question("What topic would you like to learn today? "));
  if (!topic.trim()) {
    console.log("No topic provided. Exiting.");
    rl.close();
    return;
  }

  console.log(`\nStarting Socratic session on: "${topic}"...\n`);
  const session = new TeachingSession(llm, subagents, { topic });

  // Stream handler
  session.on("chunk", (chunk: string) => {
    process.stdout.write(chunk);
  });

  session.on("thought", (thought: string) => {
    console.log(`\n💭 [Thought] ${thought}`);
  });

  session.on("quiz", async (quizData) => {
    console.log("\n\n┌───────────────────────────────────────────────┐");
    console.log(`│ QUIZ: ${quizData.question}`);
    if (quizData.details) console.log(`│ Details: ${quizData.details}`);
    console.log("├───────────────────────────────────────────────┘");

    for (const opt of quizData.displayedOptions) {
      console.log(`  [${opt.index}] ${opt.label}`);
    }
    console.log("  [0] I don't know (honest frontier)");

    const answerInput = await rl.question("\nYour choice (number): ");
    const choiceNum = parseInt(answerInput.trim(), 10);

    const isDontKnow = choiceNum === 0 || isNaN(choiceNum);
    const selected = quizData.displayedOptions.find((o) => o.index === choiceNum);
    const note = await rl.question("Any quick note or reasoning (optional, press Enter to skip): ");

    console.log("\nEvaluating answer...\n");
    await session.submitQuiz({
      selectedValues: selected ? [selected.value] : [],
      isDontKnow,
      note: note.trim() || undefined,
    });
  });

  session.on("quiz_result", (result) => {
    console.log("\n" + result.feedbackText);
    console.log(`Explanation: ${result.explanation}\n`);
  });

  session.on("question", async (q) => {
    console.log(`\n[Question] ${q.question}`);
    if (q.options && q.options.length > 0) {
      q.options.forEach((opt, idx) => console.log(`  [${idx + 1}] ${opt.label}`));
      const choice = await rl.question("\nYour choice: ");
      await session.submitQuestion({ selectedValues: [choice] });
    } else {
      const resp = await rl.question("\nYour answer: ");
      await session.submitQuestion({ selectedValues: [], customText: resp });
    }
  });

  session.on("turn_complete", async () => {
    const nextInput = await rl.question("\n\n(You) > ");
    if (nextInput.trim().toLowerCase() === "exit" || nextInput.trim().toLowerCase() === "quit") {
      console.log("Exiting session. Goodbye!");
      rl.close();
      return;
    }
    await session.sendUserMessage(nextInput);
  });

  // Start initial turn
  await session.sendUserMessage(`I want to learn about: ${topic}`);
}

main().catch((err) => {
  console.error("CLI error:", err);
  process.exit(1);
});
