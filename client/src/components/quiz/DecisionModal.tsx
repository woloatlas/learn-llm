import React, { useState } from "react";
import { type AskQuestionPayload } from "../../types.ts";
import { Compass, Send } from "lucide-react";

interface Props {
  payload: AskQuestionPayload;
  onSubmit: (submission: { selectedValues: string[]; customText?: string }) => void;
}

export const DecisionModal: React.FC<Props> = ({ payload, onSubmit }) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const isMulti = Boolean(payload.multiSelect);
  const hasOptions = Boolean(payload.options && payload.options.length > 0);

  const toggleOption = (val: string) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedValues.length === 0 && !customText.trim()) return;

    onSubmit({
      selectedValues,
      customText: customText.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Learning Direction</h3>
            <p className="text-xs text-slate-400">Help the teacher tailor this lesson to your goal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <p className="text-base font-medium text-slate-100">{payload.question}</p>
            {payload.details && <p className="text-xs text-slate-400 mt-1 italic">{payload.details}</p>}
          </div>

          {hasOptions && (
            <div className="space-y-2">
              {payload.options!.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={`w-full text-left p-3 rounded-xl border text-sm transition-all duration-150 flex items-center justify-between ${
                      isSelected
                        ? "bg-emerald-950/30 border-emerald-500 text-emerald-100 font-medium"
                        : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <span className="text-xs text-emerald-400 font-mono">Selected</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {hasOptions ? "Or provide custom instructions / vision:" : "Your response:"}
            </label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="E.g. I want to understand how it handles high packet loss..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-24"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={selectedValues.length === 0 && !customText.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-sm flex items-center gap-2 shadow-lg transition"
            >
              <Send className="w-4 h-4" /> Continue Lesson
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

