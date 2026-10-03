export interface QuizOption {
  label: string;
  value: string;
  description?: string;
}

export interface DisplayedOption {
  index: number; // 1-based display position shown to user
  label: string;
  value: string;
  description?: string;
}

export interface QuizParams {
  question: string;
  details?: string;
  options: QuizOption[];
  multiSelect?: boolean;
  correctAnswer: string | string[];
  explanation: string;
  shuffle?: boolean; // defaults to true
}

export interface QuizSubmission {
  selectedValues: string[];
  isDontKnow: boolean;
  note?: string;
}

export interface QuizGradeResult {
  status: "answered" | "cancelled" | "unavailable";
  question: string;
  context?: string;
  mode: "single-select" | "multi-select";
  isCorrect: boolean;
  isDontKnow: boolean;
  selectedValues: string[];
  correctValues: string[];
  options: DisplayedOption[];
  explanation: string;
  note?: string;
  feedbackText: string;
  llmFeedbackText: string; // Formatted payload sent back into conversation context
}

export const DONT_KNOW_VALUE = "__dont_know__";
export const DONT_KNOW_LABEL = "I don't know";
