import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { ArtifactStore } from "../src/services/storage/artifacts.ts";
import { VisualInspector } from "../src/services/vision/inspector.ts";
import { MermaidAuthoringSession } from "../src/core/tools/handlers/mermaid-tools.ts";
import { SvgAuthoringSession } from "../src/core/tools/handlers/svg-tools.ts";
import { MarkdownLogger } from "../src/services/storage/markdown-logger.ts";

console.log("=== Running Phase 2: Visual Services & Storage Test ===\n");

async function main() {
  const testStoreDir = path.join(process.cwd(), "test-output", "phase2-store");
  const store = new ArtifactStore(testStoreDir);
  const inspector = new VisualInspector();

  // Test 1: Mermaid Authoring & Publishing Loop
  console.log("[Test 1/3] Testing Mermaid Authoring Session...");
  const mermaidSession = new MermaidAuthoringSession(
    store,
    inspector,
    "Show that packets form a reliable TCP stream via sequence numbering.",
  );

  mermaidSession.writeMermaid(`graph TD
    A["Packets"] --> B["Sequence Num"]
    B --> C["Reliable Stream"]
  `);

  assert.equal(mermaidSession.getSource().includes("Packets"), true);

  // Test edit
  mermaidSession.editMermaid("Sequence Num", "Sequence Numbering");
  assert.equal(mermaidSession.getSource().includes("Sequence Numbering"), true);

  // Test render preview
  const preview = await mermaidSession.renderMermaid();
  assert.equal(preview.ok, true, "Preview render should succeed");
  assert.ok(preview.previewBase64, "Preview should return base64 string");

  // Test render with save_as (Publishing)
  const published = await mermaidSession.renderMermaid("tcp-ordering");
  assert.equal(published.ok, true, "Published render should succeed");
  assert.ok(published.publishedFilename, "Should return published filename");
  assert.match(published.deliverable || "", /RESULT:\s+filename:\s+viz-tcp-ordering/);

  // Verify file on disk
  const savedPath = store.resolveImagePath(published.publishedFilename!);
  assert.ok(savedPath && fs.existsSync(savedPath), "Published file must exist on disk");
  const stats = fs.statSync(savedPath);
  assert.ok(stats.size > 1000, `Published PNG file should be valid size (got ${stats.size} bytes)`);
  console.log(`✓ Mermaid Authoring & Publishing SUCCESS (${published.publishedFilename}, ${stats.size} bytes)`);

  // Test 2: SVG Authoring & Publishing Loop
  console.log("\n[Test 2/3] Testing SVG Authoring Session...");
  const svgSession = new SvgAuthoringSession(
    store,
    inspector,
    "Show a 2D coordinate vector on an axis.",
  );

  svgSession.writeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <line x1="20" y1="180" x2="180" y2="180" stroke="#000" stroke-width="2"/>
    <line x1="20" y1="180" x2="20" y2="20" stroke="#000" stroke-width="2"/>
    <circle cx="100" cy="100" r="10" fill="#3b82f6"/>
    <text x="115" y="105" font-family="sans-serif" font-size="12">Target</text>
  </svg>`);

  svgSession.editSvg("Target", "Target Point (x,y)");
  const svgPublished = await svgSession.renderSvg("coordinate-geometry");
  assert.equal(svgPublished.ok, true, "SVG publishing should succeed");
  assert.match(svgPublished.deliverable || "", /RESULT:\s+filename:\s+viz-coordinate-geometry/);

  const svgSavedPath = store.resolveImagePath(svgPublished.publishedFilename!);
  assert.ok(svgSavedPath && fs.existsSync(svgSavedPath), "Published SVG PNG must exist on disk");
  console.log(`✓ SVG Authoring & Publishing SUCCESS (${svgPublished.publishedFilename})`);

  // Test 3: Markdown Logger with Obsidian Callouts
  console.log("\n[Test 3/3] Testing Obsidian-Style Markdown Logger...");
  const logger = new MarkdownLogger(store, "Internet Protocols");
  assert.ok(fs.existsSync(logger.getLogPath()), "Markdown log file must be created on disk");

  const logContent = fs.readFileSync(logger.getLogPath(), "utf8");
  assert.match(logContent, /# Lesson: Internet Protocols/);
  console.log(`✓ Markdown Logger initialized at: ${logger.getLogPath()}`);

  console.log("\n🎉 ALL PHASE 2 VISUAL & STORAGE TESTS PASSED!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
