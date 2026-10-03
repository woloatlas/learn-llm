import {
  type QuizOption,
  type DisplayedOption,
  type QuizParams,
  type QuizSubmission,
  type QuizGradeResult,
  DONT_KNOW_VALUE,
} from "./types.ts";

/**
 * Normalizes and validates incoming quiz options.
 * Ensures labels/values are trimmed and no duplicate values exist.
 */
export function normalizeOptions(
  options: Array<{ label: string; value?: string; description?: string }> | undefined,
): QuizOption[] {
  if (!options || options.length === 0) {
    throw new Error("Quiz requires at least two options.");
  }
  const seen = new Set<string>();
  const normalized = options
    .map((option) => ({
      label: option.label.trim(),
      value: option.value?.trim() || option.label.trim(),
      description: option.description?.trim() || undefined,
    }))
    .filter((option) => option.label.length > 0);

  if (normalized.length < 2) {
    throw new Error("Quiz must contain at least 2 non-empty options.");
  }

  for (const opt of normalized) {
    if (seen.has(opt.value)) {
      throw new Error(`Duplicate option value detected: "${opt.value}"`);
    }
    seen.add(opt.value);
  }

  return normalized;
}

/**
 * Fisher-Yates in-place shuffle over a copy of options.
 */
export function shuffleOptions(options: QuizOption[]): QuizOption[] {
  const out = [...options];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Coerces model-supplied correct answers (handling raw array, JSON-stringified array, or single string).
 */
export function coerceCorrectAnswer(correctAnswer: string | string[]): string[] {
  if (Array.isArray(correctAnswer)) return correctAnswer.map((v) => String(v).trim());
  const trimmed = String(correctAnswer).trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim());
    } catch {
      // Fall through to single string
    }
  }
  return [trimmed];
}

/**
 * Prepares the quiz for presentation to the user:
 * Normalizes options, applies optional shuffle, and maps to 1-based DisplayedOption array.
 */
export function prepareQuizDisplay(params: QuizParams): {
  normalized: QuizOption[];
  displayed: DisplayedOption[];
  correctValues: string[];
} {
  const normalized = normalizeOptions(params.options);
  const correctValues = coerceCorrectAnswer(params.correctAnswer);

  // Validate that all correctValues exist in normalized options
  const validValues = new Set(normalized.map((o) => o.value));
  for (const cv of correctValues) {
    if (!validValues.has(cv)) {
      throw new Error(
        `correctAnswer "${cv}" does not match any valid option value: [${Array.from(validValues).join(", ")}]`,
      );
    }
  }

  const order = params.shuffle === false ? normalized : shuffleOptions(normalized);
  const displayed: DisplayedOption[] = order.map((opt, idx) => ({
    index: idx + 1,
    label: opt.label,
    value: opt.value,
    description: opt.description,
  }));

  return { normalized, displayed, correctValues };
}

/**
 * Grades a user's quiz submission against prepared quiz options.
 */
export function gradeQuiz(
  params: QuizParams,
  displayedOptions: DisplayedOption[],
  correctValues: string[],
  submission: QuizSubmission,
): QuizGradeResult {
  const isMultiSelect = Boolean(params.multiSelect);
  const isDontKnow = Boolean(submission.isDontKnow) || submission.selectedValues.includes(DONT_KNOW_VALUE);

  let isCorrect = false;

  if (isDontKnow) {
    isCorrect = false;
  } else if (isMultiSelect) {
    const selectedSet = new Set(submission.selectedValues);
    const correctSet = new Set(correctValues);
    isCorrect = selectedSet.size === correctSet.size && [...selectedSet].every((v) => correctSet.has(v));
  } else {
    isCorrect = submission.selectedValues.length === 1 && submission.selectedValues[0] === correctValues[0];
  }

  // Find labels for selected & correct values
  const valueToLabel = new Map(displayedOptions.map((o) => [o.value, o.label]));
  const selectedLabels = submission.selectedValues.map((v) => valueToLabel.get(v) ?? v);
  const correctLabels = correctValues.map((v) => valueToLabel.get(v) ?? v);

  // Generate UI feedback
  let feedbackText = "";
  if (isDontKnow) {
    feedbackText = `You indicated "I don't know". The correct answer is: ${correctLabels.join(", ")}.`;
  } else if (isCorrect) {
    feedbackText = `✓ Correct! ${correctLabels.join(", ")}`;
  } else {
    feedbackText = `✗ Incorrect. You selected: ${selectedLabels.join(", ") || "(none)"}. Correct answer: ${correctLabels.join(", ")}.`;
  }

  // Generate LLM Feedback Text (Pedagogically diagnostic for teacher)
  const lines: string[] = [];
  lines.push(`Quiz: "${params.question}"`);
  if (isDontKnow) {
    lines.push(`Status: [I DON'T KNOW] - Learner did not guess. Knowledge edge reached here.`);
    lines.push(`Correct answer: ${correctLabels.join(", ")}`);
  } else if (isCorrect) {
    lines.push(`Status: [CORRECT]`);
    lines.push(`Learner selected: ${selectedLabels.join(", ")}`);
  } else {
    lines.push(`Status: [INCORRECT]`);
    lines.push(`Learner selected: ${selectedLabels.join(", ") || "(no selection)"}`);
    lines.push(`Correct answer: ${correctLabels.join(", ")}`);
  }

  if (submission.note?.trim()) {
    lines.push(`Learner's note / thinking: "${submission.note.trim()}"`);
  }
  lines.push(`Explanation: ${params.explanation}`);

  return {
    status: "answered",
    question: params.question,
    context: params.details,
    mode: isMultiSelect ? "multi-select" : "single-select",
    isCorrect,
    isDontKnow,
    selectedValues: submission.selectedValues,
    correctValues,
    options: displayedOptions,
    explanation: params.explanation,
    note: submission.note?.trim(),
    feedbackText,
    llmFeedbackText: lines.join("\n"),
  };
}
