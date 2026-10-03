export interface DisplayedOption {
  index: number;
  label: string;
  value: string;
  description?: string;
}

export interface QuizPayload {
  question: string;
  details?: string;
  displayedOptions: DisplayedOption[];
  multiSelect?: boolean;
}

export interface QuizResultData {
  isCorrect: boolean;
  isDontKnow: boolean;
  feedbackText: string;
  explanation: string;
  correctValues: string[];
  note?: string;
}

export interface AskQuestionPayload {
  question: string;
  details?: string;
  options?: Array<{ label: string; value: string; description?: string }>;
  multiSelect?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "teacher" | "system";
  text: string;
  timestamp: number;
  quiz?: QuizPayload;
  quizResult?: QuizResultData;
  question?: AskQuestionPayload;
  thought?: string;
}

export interface NoteItem {
  filename: string;
  createdAt: string;
}

