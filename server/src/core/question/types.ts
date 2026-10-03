export interface AskOption {
  label: string;
  value: string;
  description?: string;
}

export interface AskUserQuestionParams {
  question: string;
  details?: string;
  options?: AskOption[];
  multiSelect?: boolean;
}

export interface AskAnswerSubmission {
  selectedValues: string[];
  customText?: string;
}

export interface AskUserQuestionResult {
  status: "answered" | "cancelled" | "unavailable";
  question: string;
  details?: string;
  answers: Array<{ label: string; value: string }>;
  customText?: string;
  llmFeedbackText: string;
}

export function formatAskFeedback(
  params: AskUserQuestionParams,
  submission: AskAnswerSubmission,
): AskUserQuestionResult {
  const selectedValues = submission.selectedValues || [];
  const optionsMap = new Map((params.options || []).map((o) => [o.value, o.label]));

  const answers = selectedValues.map((val) => ({
    value: val,
    label: optionsMap.get(val) || val,
  }));

  const lines: string[] = [];
  lines.push(`User answered question: "${params.question}"`);

  if (answers.length > 0) {
    lines.push(`Selected option(s): ${answers.map((a) => a.label).join(", ")}`);
  }
  if (submission.customText?.trim()) {
    lines.push(`Custom response: "${submission.customText.trim()}"`);
  }

  return {
    status: "answered",
    question: params.question,
    details: params.details,
    answers,
    customText: submission.customText?.trim(),
    llmFeedbackText: lines.join("\n"),
  };
}
