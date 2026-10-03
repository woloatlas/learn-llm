import { renderMermaidToPng } from "../../../services/render/mermaid.ts";
import { type ArtifactStore } from "../../../services/storage/artifacts.ts";
import { type VisualInspector } from "../../../services/vision/inspector.ts";

export class MermaidAuthoringSession {
  private currentSource = "";
  private store: ArtifactStore;
  private inspector?: VisualInspector;
  private taskBrief = "";

  constructor(store: ArtifactStore, inspector?: VisualInspector, taskBrief = "") {
    this.store = store;
    this.inspector = inspector;
    this.taskBrief = taskBrief;
  }

  public setBrief(brief: string) {
    this.taskBrief = brief;
  }

  public getSource(): string {
    return this.currentSource;
  }

  public writeMermaid(source: string): { ok: boolean; lines: number; message: string } {
    const trimmed = (source || "").trim();
    if (!trimmed) {
      throw new Error("write_mermaid requires a non-empty source string.");
    }
    this.currentSource = trimmed;
    const lines = trimmed.split("\n").length;
    return {
      ok: true,
      lines,
      message: `Wrote ${lines}-line Mermaid source. Call render_mermaid to preview or edit_mermaid to refine.`,
    };
  }

  public editMermaid(oldText: string, newText: string): { ok: boolean; message: string } {
    if (!this.currentSource) {
      throw new Error("edit_mermaid: no source available. Call write_mermaid first.");
    }
    if (!oldText) {
      throw new Error("old_text must be non-empty.");
    }

    const first = this.currentSource.indexOf(oldText);
    if (first === -1) {
      throw new Error(`old_text "${oldText.slice(0, 30)}..." not found in source.`);
    }
    const second = this.currentSource.indexOf(oldText, first + 1);
    if (second !== -1) {
      throw new Error("old_text appears multiple times; include surrounding context for uniqueness.");
    }

    this.currentSource =
      this.currentSource.slice(0, first) + newText + this.currentSource.slice(first + oldText.length);

    return {
      ok: true,
      message: "Applied replacement edit. Call render_mermaid to preview.",
    };
  }

  public async renderMermaid(saveAs?: string): Promise<{
    ok: boolean;
    previewBase64?: string;
    publishedFilename?: string;
    publishedPath?: string;
    visualAudit?: string;
    deliverable?: string;
    error?: string;
  }> {
    if (!this.currentSource) {
      throw new Error("render_mermaid: no source available. Call write_mermaid first.");
    }

    const render = await renderMermaidToPng(this.currentSource);
    if (!render.ok || !render.pngBuffer) {
      return {
        ok: false,
        error: render.error || "Rendering produced no image output.",
      };
    }

    // Run visual inspection if inspector available
    let visualAudit = "Render successful.";
    if (this.inspector && this.taskBrief) {
      const inspect = await this.inspector.inspectDiagram(render.pngBuffer, this.taskBrief, "mermaid");
      visualAudit = `Visual Inspection (Score: ${inspect.score}/10): ${inspect.feedback}`;
    }

    if (saveAs) {
      const asset = this.store.publishImage(render.pngBuffer, saveAs);
      const deliverable = `RESULT:\nfilename: ${asset.filename}\npath: ${asset.path}`;
      return {
        ok: true,
        publishedFilename: asset.filename,
        publishedPath: asset.path,
        visualAudit,
        deliverable,
      };
    }

    return {
      ok: true,
      previewBase64: render.pngBuffer.toString("base64"),
      visualAudit,
    };
  }
}
