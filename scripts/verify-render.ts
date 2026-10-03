import * as fs from "node:fs";
import * as path from "node:path";
import { findChrome, run } from "../extensions/visual-tools/tools/_common.ts";
import { Resvg } from "@resvg/resvg-js";

async function main() {
  console.log("=== Phase 0: Diagram Rendering Verification ===\n");

  const testDir = path.join(process.cwd(), "test-output");
  fs.mkdirSync(testDir, { recursive: true });

  // 1. Detect Chrome / Chromium
  const chrome = findChrome();
  console.log(`[Chrome Detection] Located Chrome at: ${chrome ?? "None found (will attempt puppeteer bundled fallback)"}`);

  // 2. Test SVG Rendering via @resvg/resvg-js
  console.log("\n[Test 1/2] Testing Cross-Platform SVG -> PNG rendering via Resvg...");
  const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
    <rect width="100%" height="100%" fill="#1e1e2e" rx="12" />
    <circle cx="80" cy="100" r="40" fill="#89b4fa" />
    <text x="80" y="105" text-anchor="middle" fill="#11111b" font-family="sans-serif" font-weight="bold" font-size="16">Axiom</text>
    <path d="M 130 100 L 250 100" stroke="#cdd6f4" stroke-width="3" marker-end="url(#arrow)" />
    <circle cx="300" cy="100" r="40" fill="#a6e3a1" />
    <text x="300" y="105" text-anchor="middle" fill="#11111b" font-family="sans-serif" font-weight="bold" font-size="16">Derived</text>
  </svg>`;

  const svgOutputPath = path.join(testDir, "test-svg.png");
  try {
    const resvg = new Resvg(sampleSvg, { fitTo: { mode: "zoom", value: 2 } });
    const pngData = resvg.render().asPng();
    fs.writeFileSync(svgOutputPath, pngData);
    const stats = fs.statSync(svgOutputPath);
    console.log(`✓ SVG rendering SUCCESS: ${svgOutputPath} (${stats.size} bytes)`);
  } catch (err) {
    console.error("✗ SVG rendering FAILED:", err);
    process.exitCode = 1;
  }

  // 3. Test Mermaid Rendering via @mermaid-js/mermaid-cli (mmdc)
  console.log("\n[Test 2/2] Testing Mermaid -> PNG rendering via mmdc...");
  const sampleMermaid = `graph TD
    A["Unconditional Truth: Packets are Discrete"] --> B["Motivated Discovery: How to order them?"]
    B --> C["Sequence Numbers"]
    C --> D["Reliable Stream (TCP)"]
    style A fill:#89b4fa,stroke:#b4befe,stroke-width:2px,color:#11111b
    style D fill:#a6e3a1,stroke:#94e2d5,stroke-width:2px,color:#11111b
`;
  const mmdPath = path.join(testDir, "test-diagram.mmd");
  const mmdOutputPath = path.join(testDir, "test-diagram.png");
  fs.writeFileSync(mmdPath, sampleMermaid, "utf8");

  const puppeteerCfgPath = path.join(testDir, "puppeteer.json");
  fs.writeFileSync(
    puppeteerCfgPath,
    JSON.stringify(chrome ? { executablePath: chrome, args: ["--no-sandbox"] } : { args: ["--no-sandbox"] }),
    "utf8"
  );

  const isWin = process.platform === "win32";
  const mmdcBin = isWin
    ? path.join(process.cwd(), "node_modules", ".bin", "mmdc.cmd")
    : path.join(process.cwd(), "node_modules", ".bin", "mmdc");

  console.log(`Using mmdc binary at: ${mmdcBin}`);
  if (!fs.existsSync(mmdcBin)) {
    console.warn(`Warning: ${mmdcBin} does not exist yet (waiting for npm install).`);
  } else {
    try {
      const res = await run(
        mmdcBin,
        ["-i", mmdPath, "-o", mmdOutputPath, "-p", puppeteerCfgPath, "-s", "2", "-b", "white"],
        { cwd: testDir, timeoutMs: 60000, env: { PUPPETEER_SKIP_DOWNLOAD: "1" } }
      );
      if (res.code === 0 && fs.existsSync(mmdOutputPath)) {
        const stats = fs.statSync(mmdOutputPath);
        console.log(`✓ Mermaid rendering SUCCESS: ${mmdOutputPath} (${stats.size} bytes)`);
      } else {
        console.error(`✗ Mermaid rendering failed with code ${res.code}:`);
        console.error(res.stderr || res.stdout);
        process.exitCode = 1;
      }
    } catch (err) {
      console.error("✗ Mermaid execution error:", err);
      process.exitCode = 1;
    }
  }

  console.log("\n=== Diagram Rendering Verification Finished ===");
}

main().catch((err) => {
  console.error("Unexpected error in main:", err);
  process.exit(1);
});
