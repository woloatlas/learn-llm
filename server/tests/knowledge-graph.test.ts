import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { KnowledgeGraphService } from "../src/services/storage/knowledge-graph.ts";
import { ObsidianExporter } from "../src/services/storage/obsidian-exporter.ts";
import { ArtifactStore } from "../src/services/storage/artifacts.ts";

console.log("=== Running Phase 5: Knowledge Graph & Obsidian Exporter Test ===\n");

function main() {
  const kg = new KnowledgeGraphService(":memory:");

  // Test 1: Record Unconditional Truths (Bedrock Axioms)
  console.log("[Test 1/3] Testing Unconditional Truth Recording...");
  kg.recordAxiom("Computer Networks", "All network communication is achieved via discrete packets.");
  kg.recordAxiom("Calculus", "A limit describes behavior near a point, not necessarily at the point.");

  const graph = kg.getGraphData();
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.summary.axiomsCount, 2);
  assert.equal(graph.nodes[0].type, "axiom");
  console.log(`✓ Recorded ${graph.summary.axiomsCount} foundational unconditional truths.`);

  // Test 2: Misconceptions & Spaced Repetition Scheduling
  console.log("\n[Test 2/3] Testing Misconceptions & Spaced Repetition...");
  kg.recordMisconception(
    "Calculus",
    "Limits",
    "Believed limit f(x) must equal f(c)",
    "Punctured neighborhoods isolate the limit from the function value at c.",
  );

  // Schedule review due now (0 days)
  kg.scheduleReview("Calculus", "Does limit f(x) as x->c depend on f(c)?", "No", "It is defined on punctured interval.", 0);

  const dueReviews = kg.getDueReviews();
  assert.equal(dueReviews.length, 1);
  assert.equal(dueReviews[0].topic, "Calculus");
  assert.match(dueReviews[0].question, /Does limit/);
  console.log(`✓ Spaced repetition successfully flagged ${dueReviews.length} concept review.`);

  kg.close();

  // Test 3: Obsidian Vault Exporter
  console.log("\n[Test 3/3] Testing Obsidian Vault Export...");
  const testStoreDir = path.join(process.cwd(), "test-output", "vault-test-store");
  const store = new ArtifactStore(testStoreDir);

  // Create a sample note and image
  const notesDir = store.getNotesDir();
  fs.writeFileSync(path.join(notesDir, "test-lesson.md"), "# Test Lesson\n\nContent here.", "utf8");
  store.publishImage(Buffer.from("fake-png-data"), "test-diagram");

  const exporter = new ObsidianExporter(store);
  const exportDir = path.join(process.cwd(), "test-output", "exported-vault");
  const exportResult = exporter.exportVault(exportDir);

  assert.ok(exportResult.notesCount >= 1);
  assert.ok(exportResult.diagramsCount >= 1);
  assert.ok(fs.existsSync(path.join(exportDir, "Index.md")));
  assert.ok(fs.existsSync(path.join(exportDir, "Notes", "test-lesson.md")));

  const indexContent = fs.readFileSync(path.join(exportDir, "Index.md"), "utf8");
  assert.match(indexContent, /# Socratic Learning Vault Hub/);
  assert.match(indexContent, /- \[\[test-lesson\]\]/);

  console.log(`✓ Obsidian Vault Export created at: ${exportDir}`);
  console.log(`  - Notes: ${exportResult.notesCount}, Diagrams: ${exportResult.diagramsCount}`);

  console.log("\n🎉 ALL PHASE 5 KNOWLEDGE GRAPH & VAULT TESTS PASSED!");
}

main();
