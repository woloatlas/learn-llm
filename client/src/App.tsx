import React, { useState } from "react";
import { useTeachingSession } from "./hooks/useTeachingSession.ts";
import { ChatContainer } from "./components/chat/ChatContainer.tsx";
import { DecisionModal } from "./components/quiz/DecisionModal.tsx";
import { DagVisualizer } from "./components/visual/DagVisualizer.tsx";
import { NotesDrawer } from "./components/notes/NotesDrawer.tsx";
import {
  GraduationCap,
  Send,
  GitBranch,
  BookOpen,
  Sparkles,
  Wifi,
  WifiOff,
  Compass,
} from "lucide-react";

export const App: React.FC = () => {
  const {
    isConnected,
    isGenerating,
    currentTopic,
    messages,
    activeQuiz,
    activeQuestion,
    activeThought,
    mermaidDag,
    startSession,
    sendMessage,
    submitQuiz,
    submitQuestion,
  } = useTeachingSession();

  const [inputTopic, setInputTopic] = useState("");
  const [inputText, setInputText] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"dag" | "notes">("dag");

  const handleStart = (topicToStart: string) => {
    if (!topicToStart.trim()) return;
    startSession(topicToStart.trim());
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    sendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Navigation Header */}
        <header className="h-16 px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-wide text-white">Learn-LLM</h1>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Socratic Studio
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-sm">
                {currentTopic ? `Active Topic: ${currentTopic}` : "Unconditional Truths & Motivated Discovery"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {isConnected ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" /> Engine Ready
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-400">
                  <WifiOff className="w-3.5 h-3.5" /> Connecting...
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 shadow-2xl">
              <Sparkles className="w-8 h-8" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              What do you want to truly understand today?
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8">
              We'll derive the concept from foundational unconditional truths using Socratic inquiry and verified visuals.
              Facts won't just be memorized—they will click into place.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStart(inputTopic);
              }}
              className="w-full flex gap-2 max-w-lg mb-6"
            >
              <input
                type="text"
                value={inputTopic}
                onChange={(e) => setInputTopic(e.target.value)}
                placeholder="E.g., How TCP packets work, Coordinate Vectors, Calculus..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
              />
              <button
                type="submit"
                disabled={!inputTopic.trim()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-lg transition"
              >
                Begin Lesson
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-500">Popular topics:</span>
              {["How TCP Works", "Transformers & Attention", "Calculus Limits", "Docker Architecture"].map(
                (topic) => (
                  <button
                    key={topic}
                    onClick={() => handleStart(topic)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                  >
                    {topic}
                  </button>
                ),
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <ChatContainer
              messages={messages}
              activeQuiz={activeQuiz}
              activeThought={activeThought}
              isGenerating={isGenerating}
              onQuizSubmit={submitQuiz}
            />

            {/* Prompt Input Bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/70 shrink-0">
              <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={Boolean(activeQuiz) || isGenerating}
                  placeholder={
                    activeQuiz
                      ? "Answer the quiz card above to continue the lesson..."
                      : isGenerating
                      ? "Teacher is explaining..."
                      : "Type your message or follow-up question..."
                  }
                  className="flex-1 bg-slate-900 border border-slate-800 disabled:opacity-50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || Boolean(activeQuiz) || isGenerating}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl shadow-lg flex items-center justify-center transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Right Knowledge Panel (DAG & Obsidian Notes) */}
      <aside className="w-80 md:w-96 border-l border-slate-800 bg-slate-950 flex flex-col shrink-0 z-10">
        {/* Tab Selector */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex gap-1">
          <button
            onClick={() => setSidebarTab("dag")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition ${
              sidebarTab === "dag"
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" /> Dependency DAG
          </button>
          <button
            onClick={() => setSidebarTab("notes")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition ${
              sidebarTab === "notes"
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Obsidian Notes
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 p-3 overflow-hidden">
          {sidebarTab === "dag" ? (
            <DagVisualizer mermaidCode={mermaidDag} topic={currentTopic} />
          ) : (
            <NotesDrawer />
          )}
        </div>
      </aside>

      {/* Pop-up Decision Modal for ask_user_question */}
      {activeQuestion && (
        <DecisionModal payload={activeQuestion} onSubmit={submitQuestion} />
      )}
    </div>
  );
};

