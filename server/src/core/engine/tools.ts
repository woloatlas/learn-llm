import { type ToolDeclaration } from "../../llm/types.ts";

export const TEACHING_TOOLS: ToolDeclaration[] = [
  {
    functionDeclarations: [
      {
        name: "quiz",
        description:
          "Pose a graded multiple-choice question to the learner to bracket their knowledge edge or confirm understanding of a node. Options only (no free text). Instant feedback is shown after answering.",
        parameters: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The single quiz question to ask.",
            },
            details: {
              type: "string",
              description: "Optional context or guidance shown under the question.",
            },
            options: {
              type: "array",
              description: "2 or more answer options. Provide stable values for each.",
              items: {
                type: "object",
                properties: {
                  label: { type: "string", description: "Display label for the option." },
                  value: { type: "string", description: "Stable machine-readable identifier for option." },
                  description: { type: "string", description: "Optional extra clarification below label." },
                },
                required: ["label", "value"],
              },
            },
            multiSelect: {
              type: "boolean",
              description: "Set to true when more than one option is correct and must be selected.",
            },
            correctAnswer: {
              type: "string",
              description:
                "REQUIRED. The correct answer matching the value of the intended option (or comma/JSON list if multi-select). Always reference the option value, not position.",
            },
            explanation: {
              type: "string",
              description: "REQUIRED. Explanation revealed after learner submits their answer.",
            },
            shuffle: {
              type: "boolean",
              description: "Defaults to true. Set to false only when order is meaningful (e.g. numeric scale).",
            },
          },
          required: ["question", "options", "correctAnswer", "explanation"],
        },
      },
      {
        name: "ask_user_question",
        description:
          "Ask the learner an open-ended question or preference fork where there is NO right or wrong answer (e.g. clarifying goals, choosing next topic direction).",
        parameters: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The question to ask the learner.",
            },
            details: {
              type: "string",
              description: "Optional extra context or instructions.",
            },
            options: {
              type: "array",
              description: "Optional choices. If omitted, user provides freeform text.",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  value: { type: "string" },
                  description: { type: "string" },
                },
                required: ["label", "value"],
              },
            },
            multiSelect: {
              type: "boolean",
              description: "True if learner can select multiple options.",
            },
          },
          required: ["question"],
        },
      },
      {
        name: "subagent",
        description:
          "Delegate a specialized task to a subagent: 'researcher' (for ground-truth web search & fact verification), 'mermaid-maker' (for relational/structural diagrams), or 'svg-maker' (for geometric/coordinate diagrams).",
        parameters: {
          type: "object",
          properties: {
            agent: {
              type: "string",
              description: "The subagent to invoke: 'researcher', 'mermaid-maker', or 'svg-maker'.",
            },
            task: {
              type: "string",
              description: "A minimal, concrete brief for the subagent.",
            },
          },
          required: ["agent", "task"],
        },
      },
    ],
  },
];
