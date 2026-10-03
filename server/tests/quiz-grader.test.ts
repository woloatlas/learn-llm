import assert from "node:assert/strict";
import {
  normalizeOptions,
  shuffleOptions,
  coerceCorrectAnswer,
  prepareQuizDisplay,
  gradeQuiz,
} from "../src/core/quiz/grader.ts";
import { type QuizParams } from "../src/core/quiz/types.ts";

console.log("=== Running Quiz Grader Unit Tests ===\n");

// Test 1: Normalize Options
console.log("[Test 1] Option Normalization & Validation...");
const rawOptions = [
  { label: "  Option A  ", value: "opt_a" },
  { label: "Option B", value: "opt_b" },
];
const normalized = normalizeOptions(rawOptions);
assert.equal(normalized.length, 2);
assert.equal(normalized[0].label, "Option A");

assert.throws(() => {
  normalizeOptions([{ label: "Single" }]);
}, /at least 2 non-empty options/);

assert.throws(() => {
  normalizeOptions([
    { label: "Dup 1", value: "dup" },
    { label: "Dup 2", value: "dup" },
  ]);
}, /Duplicate option value/);
console.log("✓ Option Normalization passed.");

// Test 2: Coerce Correct Answer
console.log("\n[Test 2] Coerce Correct Answer...");
assert.deepEqual(coerceCorrectAnswer("alpha"), ["alpha"]);
assert.deepEqual(coerceCorrectAnswer(["alpha", "beta"]), ["alpha", "beta"]);
assert.deepEqual(coerceCorrectAnswer('["alpha", "beta"]'), ["alpha", "beta"]);
console.log("✓ Coerce Correct Answer passed.");

// Test 3: Prepare Quiz Display & Shuffling
console.log("\n[Test 3] Prepare Quiz Display...");
const sampleQuiz: QuizParams = {
  question: "What is an unconditional truth?",
  options: [
    { label: "A fact accepted as-is with no caveats", value: "unconditional" },
    { label: "A theorem derived from five other steps", value: "derived" },
    { label: "A heuristic that usually works", value: "heuristic" },
  ],
  correctAnswer: "unconditional",
  explanation: "Unconditional truths are ground-level propositions safe to lock in immediately.",
};

const prepared = prepareQuizDisplay(sampleQuiz);
assert.equal(prepared.displayed.length, 3);
assert.equal(prepared.correctValues[0], "unconditional");
assert.ok(prepared.displayed.every((d) => d.index >= 1 && d.index <= 3));
console.log("✓ Prepare Quiz Display passed.");

// Test 4: Single-Select Correct & Incorrect Grading
console.log("\n[Test 4] Single-Select Grading...");
const correctSubmission = {
  selectedValues: ["unconditional"],
  isDontKnow: false,
  note: "I remembered principle 1",
};
const resultCorrect = gradeQuiz(sampleQuiz, prepared.displayed, prepared.correctValues, correctSubmission);
assert.equal(resultCorrect.isCorrect, true);
assert.equal(resultCorrect.isDontKnow, false);
assert.match(resultCorrect.feedbackText, /✓ Correct!/);
assert.match(resultCorrect.llmFeedbackText, /Status: \[CORRECT\]/);
assert.match(resultCorrect.llmFeedbackText, /Learner's note \/ thinking: "I remembered principle 1"/);

const incorrectSubmission = {
  selectedValues: ["derived"],
  isDontKnow: false,
};
const resultIncorrect = gradeQuiz(sampleQuiz, prepared.displayed, prepared.correctValues, incorrectSubmission);
assert.equal(resultIncorrect.isCorrect, false);
assert.equal(resultIncorrect.isDontKnow, false);
assert.match(resultIncorrect.feedbackText, /✗ Incorrect/);
assert.match(resultIncorrect.llmFeedbackText, /Status: \[INCORRECT\]/);
console.log("✓ Single-Select Grading passed.");

// Test 5: Multi-Select Exact Match vs Partial Match
console.log("\n[Test 5] Multi-Select Grading...");
const multiQuiz: QuizParams = {
  question: "Select the two teaching principles of the system:",
  multiSelect: true,
  options: [
    { label: "Unconditional truths first", value: "unconditional" },
    { label: "Motivated discovery (How could I have discovered this?)", value: "motivated" },
    { label: "Rote flashcard repetition", value: "rote" },
  ],
  correctAnswer: ["unconditional", "motivated"],
  explanation: "The two principles are unconditional truths and motivated discovery.",
};
const multiPrep = prepareQuizDisplay(multiQuiz);

// Full match
const fullMatch = gradeQuiz(multiQuiz, multiPrep.displayed, multiPrep.correctValues, {
  selectedValues: ["motivated", "unconditional"], // order varied
  isDontKnow: false,
});
assert.equal(fullMatch.isCorrect, true);

// Partial match (only 1 selected)
const partialMatch = gradeQuiz(multiQuiz, multiPrep.displayed, multiPrep.correctValues, {
  selectedValues: ["unconditional"],
  isDontKnow: false,
});
assert.equal(partialMatch.isCorrect, false);

// Superset match (both correct + 1 wrong)
const supersetMatch = gradeQuiz(multiQuiz, multiPrep.displayed, multiPrep.correctValues, {
  selectedValues: ["unconditional", "motivated", "rote"],
  isDontKnow: false,
});
assert.equal(supersetMatch.isCorrect, false);
console.log("✓ Multi-Select Grading passed.");

// Test 6: "I Don't Know" Distinct Boundary Signal
console.log("\n[Test 6] 'I Don't Know' Signal Handling...");
const dontKnowResult = gradeQuiz(sampleQuiz, prepared.displayed, prepared.correctValues, {
  selectedValues: [],
  isDontKnow: true,
  note: "I've never studied epistemology",
});
assert.equal(dontKnowResult.isCorrect, false);
assert.equal(dontKnowResult.isDontKnow, true);
assert.match(dontKnowResult.feedbackText, /You indicated "I don't know"/);
assert.match(dontKnowResult.llmFeedbackText, /Status: \[I DON'T KNOW\] - Learner did not guess/);
assert.match(dontKnowResult.llmFeedbackText, /Learner's note \/ thinking: "I've never studied epistemology"/);
console.log("✓ 'I Don't Know' Handling passed.");

console.log("\n🎉 ALL QUIZ GRADER UNIT TESTS PASSED!");
