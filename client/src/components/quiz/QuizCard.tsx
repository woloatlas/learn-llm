import React, { useState } from "react";
import { type QuizPayload, type QuizResultData } from "../../types.ts";
import { CheckCircle2, XCircle, HelpCircle, ChevronDown, ChevronUp, Send, FileText } from "lucide-react";

interface Props {
  quiz: QuizPayload;
  result?: QuizResultData;
  onSubmit: (submission: { selectedValues: string[]; isDontKnow: boolean; note?: string }) => void;
  disabled?: boolean;
}

export const QuizCard: React.FC<Props> = ({ quiz, result, onSubmit, disabled }) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [isDontKnow, setIsDontKnow] = useState(false);
  const [note, setNote] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);

  const isMulti = Boolean(quiz.multiSelect);
  const isAnswered = Boolean(result);

  const toggleOption = (val: string) => {
    if (isAnswered || disabled) return;
    setIsDontKnow(false);

    if (isMulti) {
      if (selectedValues.includes(val)) {
        setSelectedValues(selectedValues.filter((v) => v !== val));
      } else {
        setSelectedValues([...selectedValues, val]);
      }
    } else {
      setSelectedValues([val]);
    }
  };

  const handleDontKnow = () => {
    if (isAnswered || disabled) return;
    setSelectedValues([]);
    setIsDontKnow(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || isAnswered) return;
    if (selectedValues.length === 0 && !isDontKnow) return;

    onSubmit({
      selectedValues,
      isDontKnow,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="w-full my-6 bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="font-semibold text-white tracking-wide text-sm md:text-base">
            Knowledge Check {isMulti ? "(Select All That Apply)" : "(Single Choice)"}
          </h3>
        </div>
        {isAnswered && (
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
            {result?.isDontKnow ? (
              <span className="text-amber-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Frontier Located
              </span>
            ) : result?.isCorrect ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Incorrect
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-5 md:p-6 space-y-5">
        {/* Question Title */}
        <div>
          <p className="text-base md:text-lg font-medium text-slate-100 leading-snug">{quiz.question}</p>
          {quiz.details && <p className="text-xs text-slate-400 mt-1 italic">{quiz.details}</p>}
        </div>

        {/* Options List */}
        <div className="space-y-2.5">
          {quiz.displayedOptions.map((opt) => {
            const isSelected = selectedValues.includes(opt.value);
            const isCorrectOption = result?.correctValues?.includes(opt.value);

            let borderStyle = "border-slate-800 hover:border-slate-700 bg-slate-950/40";
            let textStyle = "text-slate-200";

            if (isAnswered) {
              if (isCorrectOption) {
                borderStyle = "border-emerald-500/80 bg-emerald-950/30 text-emerald-200 shadow-sm";
                textStyle = "text-emerald-200 font-medium";
              } else if (isSelected && !result?.isCorrect) {
                borderStyle = "border-rose-500/80 bg-rose-950/30 text-rose-200";
                textStyle = "text-rose-200";
              }
            } else if (isSelected) {
              borderStyle = "border-emerald-500 bg-emerald-950/20 text-emerald-100 shadow-sm";
            }

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleOption(opt.value)}
                disabled={isAnswered || disabled}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 ${borderStyle}`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border text-xs font-mono transition ${
                    isAnswered
                      ? isCorrectOption
                        ? "bg-emerald-500 border-emerald-400 text-slate-950 font-bold"
                        : isSelected
                        ? "bg-rose-500 border-rose-400 text-white font-bold"
                        : "border-slate-700 text-slate-500"
                      : isSelected
                      ? "bg-emerald-600 border-emerald-500 text-white font-bold"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {isAnswered ? (
                    isCorrectOption ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isSelected ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      opt.index
                    )
                  ) : (
                    opt.index
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm md:text-base leading-snug ${textStyle}`}>{opt.label}</div>
                  {opt.description && <div className="text-xs text-slate-400 mt-1">{opt.description}</div>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Controls when not answered */}
        {!isAnswered && (
          <form onSubmit={handleSubmit} className="pt-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDontKnow}
                disabled={disabled}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                  isDontKnow
                    ? "bg-amber-950/40 border-amber-500/80 text-amber-200 shadow-sm"
                    : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                I don't know (honest frontier)
              </button>

              <button
                type="button"
                onClick={() => setShowNoteField(!showNoteField)}
                className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1 transition"
              >
                <FileText className="w-3.5 h-3.5" />
                {showNoteField ? "Hide Note" : "Add Note / Reasoning"}
              </button>
            </div>

            {showNoteField && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional: What was your thought process? (helps the teacher diagnose gaps)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-16 transition"
              />
            )}

            <button
              type="submit"
              disabled={disabled || (selectedValues.length === 0 && !isDontKnow)}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all duration-200"
            >
              <Send className="w-4 h-4" /> Submit Answer
            </button>
          </form>
        )}

        {/* Post-submission Feedback and Explanation */}
        {isAnswered && result && (
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm leading-relaxed">
              <div className="font-semibold text-slate-200 mb-1">{result.feedbackText}</div>
              {result.note && <div className="text-xs text-slate-400 italic mb-2">Your note: "{result.note}"</div>}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-900/60 transition"
              >
                <span>Explanation & First Principles</span>
                {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showExplanation && (
                <div className="p-4 pt-1 text-xs md:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-900/20">
                  {result.explanation}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

