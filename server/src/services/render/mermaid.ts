import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { findChrome, run } from "../../../../extensions/visual-tools/tools/_common.ts";

export interface MermaidRenderResult {
  ok: boolean;
  pngBuffer?: Buffer;
  outPath?: string;
  error?: string;
}

export interface MermaidRenderOptions {
  scale?: number;
  backgroundColor?: string;
  timeoutMs?: number;
}

/**
 * Resolves the mmdc executable path across platforms.
 */
function resolveMmdcBin(): string {
  const isWin = process.platform === "win32";
  const binName = isWin ? "mmdc.cmd" : "mmdc";
  const candidates = [
    path.join(process.cwd(), "node_modules", ".bin", binName),
    path.join(process.cwd(), "node_modules", ".bin", "mmdc"),
    path.join(process.cwd(), "..", "node_modules", ".bin", binName),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return binName;
}

/**
 * Renders a Mermaid diagram string to a PNG file and returns the buffer.
 */
export async function renderMermaidToPng(
  mermaidSource: string,
  options: MermaidRenderOptions = {},
): Promise<MermaidRenderResult> {
  const stagingDir = path.join(os.tmpdir(), "learn-llm-render", `mmd-${Date.now()}`);
  fs.mkdirSync(stagingDir, { recursive: true });

  const inputPath = path.join(stagingDir, "diagram.mmd");
  const outputPath = path.join(stagingDir, "output.png");
  const cfgPath = path.join(stagingDir, "puppeteer.json");

  fs.writeFileSync(inputPath, mermaidSource.trim(), "utf8");

  const chrome = findChrome();
  fs.writeFileSync(
    cfgPath,
    JSON.stringify(
      chrome
        ? { executablePath: chrome, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
        : { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
    ),
    "utf8",
  );

  const mmdcBin = resolveMmdcBin();
  const scale = String(options.scale || 2);
  const bg = options.backgroundColor || "white";
  const timeoutMs = options.timeoutMs || 60000;

  try {
    const res = await run(
      mmdcBin,
      ["-i", inputPath, "-o", outputPath, "-p", cfgPath, "-s", scale, "-b", bg],
      { cwd: stagingDir, timeoutMs, env: { PUPPETEER_SKIP_DOWNLOAD: "1" } },
    );

    if (res.code === 0 && fs.existsSync(outputPath)) {
      const buffer = fs.readFileSync(outputPath);
      return {
        ok: true,
        pngBuffer: buffer,
        outPath: outputPath,
      };
    }

    const errorMsg = (res.stderr || res.stdout || "Unknown rendering failure")
      .split("\n")
      .slice(-15)
      .join("\n");
    return {
      ok: false,
      error: `mmdc failed (exit code ${res.code}):\n${errorMsg}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Mermaid rendering execution error: ${String(err)}`,
    };
  }
}
