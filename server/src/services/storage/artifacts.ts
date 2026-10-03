import * as fs from "node:fs";
import * as path from "node:path";

export interface PublishedAsset {
  filename: string;
  path: string;
  urlPath: string; // Ready for Web UI /api/viz/:filename
}

export class ArtifactStore {
  private baseDir: string;
  private vizDir: string;
  private notesDir: string;

  constructor(customBaseDir?: string) {
    const rawBase =
      customBaseDir ||
      process.env.DATA_DIR ||
      path.join(process.cwd(), "data");

    this.baseDir = path.resolve(rawBase);
    this.vizDir = path.join(this.baseDir, "viz");
    this.notesDir = path.join(this.baseDir, "notes");

    this.ensureDirs();
  }

  private ensureDirs() {
    fs.mkdirSync(this.vizDir, { recursive: true });
    fs.mkdirSync(this.notesDir, { recursive: true });
  }

  public getVizDir(): string {
    return this.vizDir;
  }

  public getNotesDir(): string {
    return this.notesDir;
  }

  /**
   * Publishes a PNG image into the storage directory with a slugified timestamped filename.
   */
  public publishImage(data: Buffer | string, topicSlug: string): PublishedAsset {
    const cleanSlug =
      topicSlug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "diagram";

    const filename = `viz-${cleanSlug}-${Date.now()}.png`;
    const targetPath = path.join(this.vizDir, filename);

    if (Buffer.isBuffer(data)) {
      fs.writeFileSync(targetPath, data);
    } else if (typeof data === "string" && fs.existsSync(data)) {
      fs.copyFileSync(data, targetPath);
    } else {
      throw new Error("Invalid image data provided for publication.");
    }

    return {
      filename,
      path: targetPath,
      urlPath: `/api/viz/${filename}`,
    };
  }

  /**
   * Resolves a diagram filename to its on-disk path if it exists.
   */
  public resolveImagePath(filename: string): string | null {
    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const fullPath = path.join(this.vizDir, safeFilename);
    return fs.existsSync(fullPath) ? fullPath : null;
  }
}
