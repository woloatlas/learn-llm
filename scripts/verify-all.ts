import { spawnSync } from "node:child_process";

console.log("=================================================");
console.log("   LEARN-LLM: PHASE 0 FULL VERIFICATION SUITE   ");
console.log("=================================================\n");

const isWin = process.platform === "win32";
const tsxCmd = isWin ? "npx.cmd" : "npx";

console.log(">>> Running Step 1: Diagram Rendering Verification (SVG & Mermaid)...");
const renderResult = spawnSync(tsxCmd, ["tsx", "scripts/verify-render.ts"], {
  stdio: "inherit",
  shell: isWin,
});

if (renderResult.status !== 0) {
  console.error("\n❌ Step 1 (Diagram Rendering) failed.");
  process.exit(1);
}

console.log("\n>>> Running Step 2: Gemini API & Grounding Verification...");
const geminiResult = spawnSync(tsxCmd, ["tsx", "scripts/verify-gemini.ts"], {
  stdio: "inherit",
  shell: isWin,
});

if (geminiResult.status !== 0) {
  console.error("\n❌ Step 2 (Gemini Verification) failed.");
  process.exit(1);
}

console.log("\n=================================================");
console.log("🎉 ALL PHASE 0 VERIFICATIONS PASSED SUCCESSFULLY!");
console.log("=================================================");
