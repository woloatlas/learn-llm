import React, { useEffect, useState } from "react";
import { type NoteItem } from "../../types.ts";
import { BookOpen, FileText, Download, Copy, Check } from "lucide-react";

export const NotesDrawer: React.FC = () => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
        if (data.notes?.length > 0 && !selectedNote) {
          loadNote(data.notes[0].filename);
        }
      }
    } catch {
      // Fallback
    }
  };

  const loadNote = async (filename: string) => {
    setSelectedNote(filename);
    try {
      const res = await fetch(`/api/notes/${filename}`);
      if (res.ok) {
        const data = await res.json();
        setNoteContent(data.content || "");
      }
    } catch {
      setNoteContent("Failed to load note.");
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(noteContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!selectedNote) return;
    const blob = new Blob([noteContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedNote;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-semibold text-slate-200 tracking-wider uppercase font-mono">
            Obsidian Session Notes
          </h4>
        </div>
        {selectedNote && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              title="Copy markdown for Obsidian"
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDownload}
              title="Download .md file"
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
          <FileText className="w-8 h-8 mb-2 opacity-30" />
          <p>No lesson notes recorded yet.</p>
          <p className="text-[11px] mt-1 text-slate-600">Start a session to generate Obsidian notes.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Note selector chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 shrink-0">
            {notes.map((n) => (
              <button
                key={n.filename}
                onClick={() => loadNote(n.filename)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition ${
                  selectedNote === n.filename
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/50"
                    : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {n.filename.replace(/\.md$/, "").slice(0, 18)}...
              </button>
            ))}
          </div>

          {/* Note content viewer */}
          <div className="flex-1 overflow-y-auto mt-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {noteContent || "Loading note..."}
          </div>
        </div>
      )}
    </div>
  );
};

