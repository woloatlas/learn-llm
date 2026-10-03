import React, { useMemo } from "react";
import katex from "katex";
import { type ChatMessage } from "../../types.ts";
import { Bot, User, Sparkles } from "lucide-react";

interface Props {
  message: ChatMessage;
}

/**
 * Parses markdown text, math ($ and $$), and Obsidian image embeds ![[...|width]]
 */
function renderFormattedContent(text: string): React.ReactNode[] {
  // 1. Convert Obsidian image embeds ![[filename.png|500]] to standard HTML images
  const parsedEmbeds = text.replace(
    /!\[\[(viz-[^\]|]+)(?:\|(\d+))?\]\]/g,
    (match, filename, width) => {
      const w = width ? `width="${width}"` : 'style="max-width: 100%; max-height: 480px;"';
      return `<div class="my-4 rounded-xl overflow-hidden border border-slate-700 bg-slate-900/50 p-2 shadow-lg inline-block">
        <img src="/api/viz/${filename}" alt="${filename}" ${w} class="rounded-lg object-contain cursor-pointer hover:opacity-95 transition" onclick="window.open('/api/viz/${filename}', '_blank')" />
        <div class="text-xs text-slate-400 mt-1.5 text-center font-mono">🔍 Click image to expand</div>
      </div>`;
    },
  );

  // 2. Tokenize for display math $$...$$ and inline math $...$
  const parts = parsedEmbeds.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);

  return parts.map((part, index) => {
    // Centered Display Math $$...$$
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const math = part.slice(2, -2).trim();
      try {
        const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
        return <div key={index} className="my-3 overflow-x-auto text-emerald-300" dangerouslySetInnerHTML={{ __html: html }} />;
      } catch {
        return <pre key={index} className="text-red-400">{part}</pre>;
      }
    }

    // Inline Math $...$
    if (part.startsWith("$") && part.endsWith("$")) {
      const math = part.slice(1, -1).trim();
      try {
        const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
        return <span key={index} className="text-emerald-300 px-0.5" dangerouslySetInnerHTML={{ __html: html }} />;
      } catch {
        return <span key={index} className="text-red-400">{part}</span>;
      }
    }

    // Standard markdown / HTML content (rendered with line breaks preserved)
    return (
      <span
        key={index}
        className="prose prose-invert max-w-none text-slate-200"
        dangerouslySetInnerHTML={{
          __html: part
            .replace(/\n\n/g, "<br/><br/>")
            .replace(/\n/g, "<br/>")
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="text-slate-300">$1</em>'),
        }}
      />
    );
  });
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.sender === "user";
  const formattedContent = useMemo(() => renderFormattedContent(message.text), [message.text]);

  return (
    <div className={`flex w-full mb-6 ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
            isUser ? "bg-emerald-600 text-white" : "bg-slate-800 text-emerald-400 border border-slate-700"
          }`}
        >
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>

        {/* Message Card */}
        <div className="flex flex-col gap-1 min-w-0">
          {message.thought && (
            <div className="mb-2 px-3 py-1.5 bg-slate-900/80 border border-emerald-500/20 rounded-lg text-xs text-emerald-400/90 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 shrink-0 animate-pulse text-emerald-400" />
              <span>{message.thought}</span>
            </div>
          )}

          <div
            className={`p-4 rounded-2xl leading-relaxed text-sm md:text-base break-words shadow-sm ${
              isUser
                ? "bg-emerald-600 text-white rounded-tr-none"
                : "bg-slate-900 border border-slate-800/80 text-slate-200 rounded-tl-none"
            }`}
          >
            {formattedContent}
          </div>

          <span className={`text-[11px] text-slate-500 px-1 font-mono ${isUser ? "text-right" : "text-left"}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
};

