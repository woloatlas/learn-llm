export type KnownAgentName = "researcher" | "mermaid-maker" | "svg-maker";

export interface SubagentDefinition {
  name: string;
  description: string;
  tools: string[];
  model?: string;
  systemPrompt: string;
}

export type AgentEventStatus =
  | "task_started"
  | "tool_call"
  | "tool_result"
  | "thought"
  | "task_completed"
  | "task_failed";

export interface AgentEvent {
  type: AgentEventStatus;
  taskId: string;
  agentName: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  agentName: string;
  task: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  error?: string;
}
