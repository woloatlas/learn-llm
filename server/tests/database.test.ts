import assert from "node:assert/strict";
import { SQLiteDatabase } from "../src/services/storage/database.ts";

console.log("=== Running Phase 4: SQLite Database Persistence Test ===\n");

function main() {
  const db = new SQLiteDatabase(":memory:");

  // Test 1: Create session & fetch
  console.log("[Test 1/3] Testing session creation and retrieval...");
  db.createSession("sess-1", "Calculus Limits");
  const sessions = db.getSessions();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, "sess-1");
  assert.equal(sessions[0].topic, "Calculus Limits");
  console.log("✓ Session stored and retrieved successfully.");

  // Test 2: Message logging
  console.log("\n[Test 2/3] Testing message logging...");
  db.saveMessage("m-1", "sess-1", "user", "What is an epsilon-delta limit?");
  db.saveMessage("m-2", "sess-1", "teacher", "Let's motivate it with a precision challenge.");
  const messages = db.getSessionMessages("sess-1");
  assert.equal(messages.length, 2);
  assert.equal(messages[0].sender, "user");
  assert.equal(messages[1].sender, "teacher");
  console.log("✓ Messages stored in chronological order.");

  // Test 3: Quiz history and stats
  console.log("\n[Test 3/3] Testing quiz history and metrics...");
  db.saveQuizResult("sess-1", "What does delta bound?", true, false, "Input distance", "Delta bounds x distance.");
  db.saveQuizResult("sess-1", "What does epsilon bound?", false, true, "Not sure", "Epsilon bounds output f(x).");

  const stats = db.getQuizStats();
  assert.equal(stats.total, 2);
  assert.equal(stats.correct, 1);
  assert.equal(stats.dontKnow, 1);
  console.log(`✓ Quiz metrics verified: ${stats.correct}/${stats.total} correct, ${stats.dontKnow} boundary checks.`);

  db.close();
  console.log("\n🎉 ALL SQLITE PERSISTENCE TESTS PASSED!");
}

main();
