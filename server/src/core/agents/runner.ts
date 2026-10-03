import { EventEmitter } from "node:events";
import { type AgentRegistry } from "./registry.ts";
import { type AgentEvent, type AgentTask } from "./types.ts";
import {
  type ILLMProvider,
  type ChatMessage,
  type ToolDeclaration,
  type ToolCallData,
} from "../../llm/types.ts";

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export interface RunnerOptions {
  maxTurns?: number;
  tools?: ToolDeclaration[];
  executeTool?: ToolExecutor;
}

export class SubagentRunner extends EventEmitter {
  private registry: AgentRegistry;
  private llm: ILLMProvider;
  private defaultExecuteTool?: ToolExecutor;
  private toolsDeclarations: Map<string, ToolDeclaration> = new Map();

  constructor(registry: AgentRegistry, llm: ILLMProvider, defaultExecuteTool?: ToolExecutor) {
    super();
    this.registry = registry;
    this.llm = llm;
    this.defaultExecuteTool = defaultExecuteTool;
  }

  public registerToolDeclaration(agentName: string, declaration: ToolDeclaration) {
    this.toolsDeclarations.set(agentName, declaration);
  }

  /**
   * Dispatches a task to a designated subagent, executing turns in an isolated context.
   */
  async runTask(agentName: string, brief: string, options: RunnerOptions = {}): Promise<string> {
    const definition = this.registry.get(agentName);
    if (!definition) {
      throw new Error(`Subagent "${agentName}" not found in registry.`);
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const task: AgentTask = {
      id: taskId,
      agentName,
      task: brief,
      status: "running",
    };

    this.emitEvent("task_started", taskId, agentName, { task: brief });

    const maxTurns = options.maxTurns || 10;
    const messages: ChatMessage[] = [
      {
        role: "user",
        parts: [{ text: brief }],
      },
    ];

    const agentTools = options.tools || (this.toolsDeclarations.get(agentName) ? [this.toolsDeclarations.get(agentName)!] : []);
    const executeTool = options.executeTool || this.defaultExecuteTool;

    try {
      for (let turn = 0; turn < maxTurns; turn++) {
        const response = await this.llm.generate(
          messages,
          definition.systemPrompt,
          agentTools,
        );

        if (response.text) {
          this.emitEvent("thought", taskId, agentName, { text: response.text });
        }

        // If the model called tools, execute them and feed back
        if (response.toolCalls && response.toolCalls.length > 0) {
          // Add model response message with function calls
          messages.push({
            role: "model",
            parts: [
              ...(response.text ? [{ text: response.text }] : []),
              ...response.toolCalls.map((tc) => ({ functionCall: { name: tc.name, args: tc.args } })),
            ],
          });

          for (const call of response.toolCalls) {
            this.emitEvent("tool_call", taskId, agentName, { tool: call.name, args: call.args });

            let resultPayload: Record<string, unknown> = {};
            if (executeTool) {
              try {
                resultPayload = await executeTool(call.name, call.args);
              } catch (err) {
                resultPayload = { error: String(err) };
              }
            } else {
              resultPayload = { warning: `No executor registered for tool "${call.name}".` };
            }

            this.emitEvent("tool_result", taskId, agentName, { tool: call.name, result: resultPayload });

            // Feed response part back
            messages.push({
              role: "user",
              parts: [{ functionResponse: { name: call.name, response: resultPayload } }],
            });
          }
          continue;
        }

        // Final text output delivered
        const finalOutput = response.text || "";
        task.status = "completed";
        task.result = finalOutput;
        this.emitEvent("task_completed", taskId, agentName, { result: finalOutput });
        return finalOutput;
      }

      throw new Error(`Subagent "${agentName}" exceeded maximum turns (${maxTurns}).`);
    } catch (err) {
      task.status = "failed";
      task.error = String(err);
      this.emitEvent("task_failed", taskId, agentName, { error: String(err) });
      throw err;
    }
  }

  private emitEvent(
    type: AgentEvent["type"],
    taskId: string,
    agentName: string,
    payload: Record<string, unknown>,
  ) {
    const event: AgentEvent = {
      type,
      taskId,
      agentName,
      timestamp: Date.now(),
      payload,
    };
    this.emit("event", event);
  }
}
