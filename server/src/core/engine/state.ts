import { type DisplayedOption, type QuizParams } from "../quiz/types.ts";
import { type AskUserQuestionParams } from "../question/types.ts";

export enum LessonPhase {
  PROBE_EDGE = "PROBE_EDGE", // Phase 1a: Bracketing learner's current knowledge edge
  PROBE_GOAL = "PROBE_GOAL", // Phase 1b: Interrogating learner's target vision
  PLAN_DAG = "PLAN_DAG",     // Phase 2: Formulating dependency graph & awaiting sign-off
  TEACH_LOOP = "TEACH_LOOP", // Phase 3: Motivate -> Establish -> Connect -> Quiz-Check
  COMPLETED = "COMPLETED",
}

export interface DependencyNode {
  id: string;
  label: string;
  isUnconditionalTruth: boolean;
  status: "unvisited" | "motivating" | "established" | "quizzed" | "mastered";
  dependencies: string[];
}

export interface TeachingState {
  topic: string;
  phase: LessonPhase;
  nodes: DependencyNode[];
  activeQuiz?: {
    params: QuizParams;
    displayed: DisplayedOption[];
    correctValues: string[];
  };
  activeQuestion?: AskUserQuestionParams;
}
