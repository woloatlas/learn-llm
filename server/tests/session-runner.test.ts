import assert from "node:assert/strict";
import { MockLLMProvider } from "../src/llm/mock.ts";
import { AgentRegistry } from "../src/core/agents/registry.ts";
import { SubagentRunner } from "../src/core/agents/runner.ts";
import { TeachingSession } from "../src/core/engine/session.ts";
import { type ChatMessage } from "../src/llm/types.ts";

console.log("=== Running End-to-End Socratic Session Runner Test ===\n");

async function runSessionTest() {
  // 1. Initialize Subagent Registry & Runner with Mock LLM
  const registry = new AgentRegistry();
  // Ensure researcher definition exists
  if (!registry.get("researcher")) {
    registry.register({
      name: "researcher",
      description: "Web researcher",
      tools: ["web_search"],
      systemPrompt: "You are a research subagent.",
    });
  }

  let turnCount = 0;
  const mockLLM = new MockLLMProvider(async (messages: ChatMessage[], systemInstruction, tools) => {
    turnCount++;

    // Turn 1: Teacher asks initial probe quiz to test foundations
    if (turnCount === 1) {
      return {
        text: "Welcome! Before we dive into TCP, let's bracket your foundational knowledge.",
        toolCalls: [
          {
            name: "quiz",
            args: {
              question: "All communication between networked computers is fundamentally achieved through which mechanism?",
              options: [
                { label: "Sending discrete packets", value: "packets" },
                { label: "Continuous analog streams", value: "analog" },
                { label: "Direct memory mapping", value: "mmap" },
              ],
              correctAnswer: "packets",
              explanation: "All internet communication bottoms out in discrete packet transmission.",
            },
          },
        ],
      };
    }

    // Turn 2: User answered quiz correctly -> Teacher delegates to researcher subagent for historical discovery
    if (turnCount === 2) {
      return {
        text: "Excellent! Packets are indeed the discrete atomic unit. Now let's delegate to the researcher to verify TCP packet header sequence numbering.",
        toolCalls: [
          {
            name: "subagent",
            args: {
              agent: "researcher",
              task: "Find how RFC 793 defines the 32-bit Sequence Number.",
            },
          },
        ],
      };
    }

    // Turn 3: Subagent output returned -> Teacher presents the synthesis
    if (turnCount >= 3) {
      return {
        text: "RFC 793 establishes a 32-bit sequence number so arbitrary packets can be reliably re-ordered into a continuous byte stream.",
      };
    }

    return { text: "Session complete." };
  });

  const subagents = new SubagentRunner(registry, mockLLM, async (name, args) => {
    return { data: `Verified RFC 793 details for ${JSON.stringify(args)}` };
  });

  const session = new TeachingSession(mockLLM, subagents, { topic: "TCP Protocol" });

  let quizReceived = false;
  let subagentEventReceived = false;
  let streamedText = "";

  session.on("chunk", (chunk: string) => {
    streamedText += chunk;
  });

  session.on("quiz", (quizData) => {
    quizReceived = true;
    console.log(`✓ Quiz Received by Client: "${quizData.question}"`);
  });

  session.on("subagent_event", (event) => {
    subagentEventReceived = true;
    console.log(`✓ Subagent Event Captured: [${event.type}] for ${event.agentName}`);
  });

  // Step 1: User sends prompt
  console.log("[Step 1] Learner sends topic request...");
  await session.sendUserMessage("I want to learn how TCP provides reliability.");
  assert.equal(quizReceived, true, "Expected quiz to be triggered on Turn 1");
  assert.ok(session.state.activeQuiz, "Active quiz should be stored in session state");

  // Step 2: User submits correct answer to quiz
  console.log("\n[Step 2] Learner submits quiz answer ('packets')...");
  const gradeResult = await session.submitQuiz({
    selectedValues: ["packets"],
    isDontKnow: false,
    note: "Packets are atomic",
  });

  assert.equal(gradeResult.isCorrect, true);
  console.log(`✓ Quiz graded: ${gradeResult.feedbackText}`);

  // Step 3: Verify subagent delegation and final response
  assert.equal(subagentEventReceived, true, "Expected subagent event to have fired during Turn 2");
  assert.match(streamedText, /RFC 793 establishes a 32-bit sequence number/);
  console.log("\n✓ Final Teacher Synthesis Received:");
  console.log(`  "${streamedText.trim().slice(-120)}"`);

  console.log("\n🎉 END-TO-END Socratic Session Runner Test PASSED!");
}

runSessionTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
