import assert from "node:assert/strict";
import { ResearchToolsHandler } from "../src/core/tools/handlers/research-tools.ts";

console.log("=== Running Phase 2: Research Service Tests ===\n");

async function main() {
  const handler = new ResearchToolsHandler();

  // Test 1: Web Fetch functionality
  console.log("[Test 1/2] Testing Web Fetch...");
  const fetchResult = await handler.webFetch("https://example.com");
  assert.equal(fetchResult.ok, true, "Fetching example.com should succeed");
  assert.ok(typeof fetchResult.content === "string", "Content should be a string");
  assert.match(fetchResult.content as string, /Example Domain/i);
  console.log("✓ Web Fetch successfully extracted plain text content.");

  // Test 2: Web Search Handler format
  console.log("\n[Test 2/2] Testing Web Search Handler structure...");
  const searchResult = await handler.webSearch("TrueNAS Dockge container setup");
  assert.ok(searchResult.query, "Query should be present");
  assert.ok(searchResult.answer || searchResult.summary, "Search answer or summary should be present");
  console.log("✓ Web Search returned valid structured results.");

  console.log("\n🎉 ALL PHASE 2 RESEARCH TESTS PASSED!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
