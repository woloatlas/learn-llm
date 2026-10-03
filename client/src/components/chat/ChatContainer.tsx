import React, { useEffect, useRef } from "react";
import { type ChatMessage, type QuizPayload } from "../../types.ts";
import { MessageBubble } from "./MessageBubble.tsx";
import { QuizCard } from "../quiz/QuizCard.tsx";
import { Sparkles } from "lucide-react";

interface Props {
  messages: ChatMessage[];
  activeQuiz: QuizPayload | null;
  activeThought: string | null;
  isGenerating: boolean;
  onQuizSubmit: (submission: { selectedValues: string[]; isDontKnow: boolean; note?: string }) => void;
}

export const ChatContainer: React.FC<Props> = ({
  messages,
  activeQuiz,
  activeThought,
  isGenerating,
  onQuizSubmit,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeQuiz, isGenerating]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {activeQuiz && (
        <div className="max-w-2xl mx-auto">
          <QuizCard quiz={activeQuiz} onSubmit={onQuizSubmit} />
        </div>
      )}

      {isGenerating && !activeQuiz && (
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 py-2 px-3 bg-slate-900/60 border border-slate-800 rounded-xl w-fit animate-pulse">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>Teacher is synthesizing first principles...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

