import { type ArtifactStore } from "../../services/storage/artifacts.ts";
import { type VisualInspector } from "../../services/vision/inspector.ts";
import { MermaidAuthoringSession } from "./handlers/mermaid-tools.ts";
import { SvgAuthoringSession } from "./handlers/svg-tools.ts";
import { ResearchToolsHandler } from "./handlers/research-tools.ts";

export class CentralToolDispatcher {
  private store: ArtifactStore;
  private inspector?: VisualInspector;
  private researchHandler: ResearchToolsHandler;

  // Active sessions per subagent task
  private mermaidSessions: Map<string, MermaidAuthoringSession> = new Map();
  private svgSessions: Map<string, SvgAuthoringSession> = new Map();

  constructor(store: ArtifactStore, inspector?: VisualInspector) {
    this.store = store;
    this.inspector = inspector;
    this.researchHandler = new ResearchToolsHandler();
  }

  public getOrCreateMermaidSession(taskId = "default", brief = ""): MermaidAuthoringSession {
    let session = this.mermaidSessions.get(taskId);
    if (!session) {
      session = new MermaidAuthoringSession(this.store, this.inspector, brief);
      this.mermaidSessions.set(taskId, session);
    } else if (brief) {
      session.setBrief(brief);
    }
    return session;
  }

  public getOrCreateSvgSession(taskId = "default", brief = ""): SvgAuthoringSession {
    let session = this.svgSessions.get(taskId);
    if (!session) {
      session = new SvgAuthoringSession(this.store, this.inspector, brief);
      this.svgSessions.set(taskId, session);
    } else if (brief) {
      session.setBrief(brief);
    }
    return session;
  }

  /**
   * Universal tool executor that SubagentRunner calls when an agent issues a tool call.
   */
  async execute(name: string, args: Record<string, unknown>, taskId = "default"): Promise<Record<string, unknown>> {
    // 1. Mermaid tools
    if (name === "write_mermaid") {
      const session = this.getOrCreateMermaidSession(taskId);
      return session.writeMermaid(String(args.source || ""));
    }
    if (name === "edit_mermaid") {
      const session = this.getOrCreateMermaidSession(taskId);
      return session.editMermaid(String(args.old_text || ""), String(args.new_text || ""));
    }
    if (name === "render_mermaid") {
      const session = this.getOrCreateMermaidSession(taskId);
      return (await session.renderMermaid(args.save_as ? String(args.save_as) : undefined)) as Record<string, unknown>;
    }

    // 2. SVG tools
    if (name === "write_svg") {
      const session = this.getOrCreateSvgSession(taskId);
      return session.writeSvg(String(args.source || ""));
    }
    if (name === "edit_svg") {
      const session = this.getOrCreateSvgSession(taskId);
      return session.editSvg(String(args.old_text || ""), String(args.new_text || ""));
    }
    if (name === "render_svg") {
      const session = this.getOrCreateSvgSession(taskId);
      return (await session.renderSvg(args.save_as ? String(args.save_as) : undefined)) as Record<string, unknown>;
    }

    // 3. Research tools
    if (name === "web_search") {
      return this.researchHandler.webSearch(String(args.query || ""));
    }
    if (name === "web_fetch") {
      return this.researchHandler.webFetch(String(args.url || ""));
    }

    return { error: `Tool "${name}" is not registered in CentralToolDispatcher.` };
  }
}
