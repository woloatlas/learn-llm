import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { GitBranch } from "lucide-react";

interface Props {
  mermaidCode?: string;
  topic?: string;
}

const DEFAULT_DAG = `graph TD
  A["Unconditional Truths"] --> B["Motivated Discovery"]
  B --> C["Derived Principles"]
  C --> D["Target Understanding"]
  style A fill:#064e3b,stroke:#059669,stroke-width:2px,color:#a7f3d0
  style D fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#bfdbfe
`;

export const DagVisualizer: React.FC<Props> = ({ mermaidCode = DEFAULT_DAG, topic }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      themeVariables: {
        darkMode: true,
        background: "#020617",
        mainBkg: "#0f172a",
        nodeBorder: "#334155",
        lineColor: "#64748b",
        textColor: "#f8fafc",
      },
    });

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      const id = `mermaid-svg-${Date.now()}`;
      mermaid
        .render(id, mermaidCode.trim())
        .then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        })
        .catch((err) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = `<pre class="text-xs text-slate-500 font-mono p-2">${mermaidCode}</pre>`;
          }
        });
    }
  }, [mermaidCode]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
        <GitBranch className="w-4 h-4 text-emerald-400" />
        <h4 className="text-xs font-semibold text-slate-200 tracking-wider uppercase font-mono">
          Mental Model Dependency DAG
        </h4>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-2 min-h-[220px]"
      />
    </div>
  );
};

