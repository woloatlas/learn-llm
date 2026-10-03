import assert from "node:assert/strict";
import { createServer } from "../src/api/server.ts";

console.log("=== Running Phase 3: Web Server & Integration Test ===\n");

async function main() {
  const app = createServer({ mockMode: true });

  // 1. Test REST Endpoints via Fastify inject
  console.log("[Test 1/3] Testing GET /api/health...");
  const healthRes = await app.inject({
    method: "GET",
    url: "/api/health",
  });
  assert.equal(healthRes.statusCode, 200);
  const healthData = JSON.parse(healthRes.payload);
  assert.equal(healthData.status, "ok");
  console.log("✓ Health endpoint returned HTTP 200 OK.");

  console.log("\n[Test 2/3] Testing GET /api/notes...");
  const notesRes = await app.inject({
    method: "GET",
    url: "/api/notes",
  });
  assert.equal(notesRes.statusCode, 200);
  const notesData = JSON.parse(notesRes.payload);
  assert.ok(Array.isArray(notesData.notes));
  console.log(`✓ Notes endpoint returned ${notesData.notes.length} note files.`);

  console.log("\n[Test 3/3] Testing GET / (React SPA Static File Serving)...");
  const indexRes = await app.inject({
    method: "GET",
    url: "/",
  });
  assert.equal(indexRes.statusCode, 200);
  assert.match(indexRes.payload, /<!doctype html>/i);
  assert.match(indexRes.payload, /Learn LLM/i);
  console.log("✓ Root endpoint successfully served compiled React Vite SPA.");

  await app.close();
  console.log("\n🎉 ALL PHASE 3 WEB SERVER TESTS PASSED!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
