import { EventEmitter } from "node:events";
import {
  type ChatMessage,
  type ILLMProvider,
  type LLMStreamChunk,
  type ToolCallData,
} from "../../llm/types.ts";
import { type SubagentRunner } from "../agents/runner.ts";
import { type AgentEvent } from "../agents/types.ts";
import {
  type QuizParams,
  type QuizSubmission,
  type QuizGradeResult,
} from "../quiz/types.ts";
import { prepareQuizDisplay, gradeQuiz } from "../quiz/grader.ts";
import {
  type AskUserQuestionParams,
  type AskAnswerSubmission,
  type AskUserQuestionResult,
  formatAskFeedback,
} from "../question/types.ts";
import { LessonPhase, type TeachingState } from "./state.ts";
import { TEACHING_TOOLS } from "./tools.ts";
import { SOCRATIC_TEACHER_SYSTEM_PROMPT } from "./prompts.ts";

export interface SessionOptions {
  topic?: string;
  systemPrompt?: string;
}

export class TeachingSession extends EventEmitter {
  public state: TeachingState;
  public messages: ChatMessage[] = [];
  private llm: ILLMProvider;
  private subagents?: SubagentRunner;
  private systemPrompt: string;
  private isProcessing = false;
  private activeToolCallId?: string;

  constructor(
    llm: ILLMProvider,
    subagents?: SubagentRunner,
    options: SessionOptions = {},
  ) {
    super();
    this.llm = llm;
    this.subagents = subagents;
    this.systemPrompt = options.systemPrompt || SOCRATIC_TEACHER_SYSTEM_PROMPT;

    this.state = {
      topic: options.topic || "General Learning",
      phase: LessonPhase.PROBE_EDGE,
      nodes: [],
    };

    if (this.subagents) {
      this.subagents.on("event", (evt: AgentEvent) => {
        this.emit("subagent_event", evt);
      });
    }
  }

  /**
   * Learner submits a standard message or prompt.
   */
  async sendUserMessage(text: string): Promise<void> {
    if (this.isProcessing) {
      throw new Error("Session is currently processing a turn.");
    }
    this.messages.push({
      role: "user",
      parts: [{ text }],
    });
    await this.runTurn();
  }

  /**
   * Learner answers an active quiz.
   */
  async submitQuiz(submission: QuizSubmission): Promise<QuizGradeResult> {
    if (!this.state.activeQuiz) {
      throw new Error("No active quiz waiting for submission.");
    }

    const { params, displayed, correctValues } = this.state.activeQuiz;
    const gradeResult = gradeQuiz(params, displayed, correctValues, submission);

    this.emit("quiz_result", gradeResult);

    // Feed result back as function response
    this.messages.push({
      role: "user",
      parts: [
        {
          functionResponse: {
            name: "quiz",
            response: { result: gradeResult.llmFeedbackText },
            ...(this.activeToolCallId ? { id: this.activeToolCallId } : {}),
          },
        },
      ],
    });

    this.state.activeQuiz = undefined;
    this.activeToolCallId = undefined;
    await this.runTurn();
    return gradeResult;
  }

  /**
   * Learner responds to an open-ended ask_user_question fork.
   */
  async submitQuestion(submission: AskAnswerSubmission): Promise<AskUserQuestionResult> {
    if (!this.state.activeQuestion) {
      throw new Error("No active question waiting for response.");
    }

    const feedback = formatAskFeedback(this.state.activeQuestion, submission);
    this.emit("question_result", feedback);

    this.messages.push({
      role: "user",
      parts: [
        {
          functionResponse: {
            name: "ask_user_question",
            response: { result: feedback.llmFeedbackText },
            ...(this.activeToolCallId ? { id: this.activeToolCallId } : {}),
          },
        },
      ],
    });

    this.state.activeQuestion = undefined;
    this.activeToolCallId = undefined;
    await this.runTurn();
    return feedback;
  }

  /**
   * Executes a model generation turn, handling text streaming, subagents, and user-facing tools.
   */
  private async runTurn(): Promise<void> {
    this.isProcessing = true;
    try {
      const stream = this.llm.chatStream(
        this.messages,
        this.systemPrompt,
        TEACHING_TOOLS,
      );

      let accumulatedText = "";
      const pendingToolCalls: ToolCallData[] = [];

      for await (const chunk of stream) {
        if (chunk.type === "text") {
          accumulatedText += chunk.text;
          this.emit("chunk", chunk.text);
        } else if (chunk.type === "tool_call") {
          pendingToolCalls.push(chunk.toolCall);
        }
      }

      // Record model message in history with mandatory Gemini 3 thoughtSignature
      const modelParts: ChatMessage["parts"] = [];
      if (accumulatedText) {
        modelParts.push({ text: accumulatedText });
      }
      for (const call of pendingToolCalls) {
        modelParts.push({
          functionCall: {
            name: call.name,
            args: call.args,
            ...(call.id ? { id: call.id } : {}),
          },
          ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}),
        });
      }

      if (modelParts.length > 0) {
        this.messages.push({
          role: "model",
          parts: modelParts,
        });
      }

      // Process tool calls if any
      if (pendingToolCalls.length > 0) {
        const call = pendingToolCalls[0]; // Process primary tool call

        if (call.name === "quiz") {
          const params = call.args as unknown as QuizParams;
          const display = prepareQuizDisplay(params);

          this.state.activeQuiz = {
            params,
            displayed: display.displayed,
            correctValues: display.correctValues,
          };
          this.activeToolCallId = call.id;

          this.emit("quiz", {
            question: params.question,
            details: params.details,
            displayedOptions: display.displayed,
            multiSelect: Boolean(params.multiSelect),
          });

          // Pause turn and await user submission
          this.isProcessing = false;
          return;
        }

        if (call.name === "ask_user_question") {
          const params = call.args as unknown as AskUserQuestionParams;
          this.state.activeQuestion = params;
          this.activeToolCallId = call.id;

          this.emit("question", params);

          // Pause turn and await user response
          this.isProcessing = false;
          return;
        }

        if (call.name === "subagent") {
          const agentName = String(call.args.agent || "");
          const taskBrief = String(call.args.task || "");

          this.emit("thought", `Delegating to subagent [${agentName}]: "${taskBrief}"`);

          let subagentResult = "";
          if (this.subagents) {
            try {
              subagentResult = await this.subagents.runTask(agentName, taskBrief);
            } catch (err) {
              subagentResult = `Subagent execution error: ${String(err)}`;
            }
          } else {
            subagentResult = `Mock result: Subagent [${agentName}] executed task successfully.`;
          }

          // Feed subagent result back to model and continue
          this.messages.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: "subagent",
                  response: { result: subagentResult },
                  ...(call.id ? { id: call.id } : {}),
                },
              },
            ],
          });

          // Model resumes automatically to integrate subagent output
          this.isProcessing = false;
          await this.runTurn();
          return;
        }
      }

      // No interactive tools blocking, turn completed
      this.emit("turn_complete", accumulatedText);
    } catch (err) {
      this.emit("error", err);
      throw err;
    } finally {
      this.isProcessing = false;
    }
  }
}
