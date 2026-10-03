import { DatabaseSync } from "node:sqlite";
import * as path from "node:path";
import * as fs from "node:fs";

export interface SessionRow {
  id: string;
  topic: string;
  status: string;
  created_at: number;
  updated_at: number;
}

export interface MessageRow {
  id: string;
  session_id: string;
  sender: string;
  content: string;
  timestamp: number;
}

export interface QuizHistoryRow {
  id: string;
  session_id: string;
  question: string;
  is_correct: number;
  is_dont_know: number;
  user_note?: string;
  explanation?: string;
  timestamp: number;
}

export interface ConceptMasteryRow {
  id: string;
  topic: string;
  concept: string;
  is_unconditional_truth: number;
  status: string;
  mastered_at: number;
}

export class SQLiteDatabase {
  private db: DatabaseSync;

  constructor(dbPath?: string) {
    const targetPath =
      dbPath ||
      (process.env.DATA_DIR
        ? path.join(process.env.DATA_DIR, "learn.db")
        : path.join(process.cwd(), "data", "learn.db"));

    if (targetPath !== ":memory:") {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }

    this.db = new DatabaseSync(targetPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS quiz_history (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        question TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        is_dont_know INTEGER NOT NULL,
        user_note TEXT,
        explanation TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS concept_mastery (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        concept TEXT NOT NULL,
        is_unconditional_truth INTEGER NOT NULL,
        status TEXT NOT NULL,
        mastered_at INTEGER NOT NULL
      );
    `);
  }

  public createSession(id: string, topic: string) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (id, topic, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, topic, "active", now, now);
  }

  public saveMessage(id: string, sessionId: string, sender: string, content: string) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO messages (id, session_id, sender, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, sessionId, sender, content, Date.now());
  }

  public saveQuizResult(
    sessionId: string,
    question: string,
    isCorrect: boolean,
    isDontKnow: boolean,
    userNote?: string,
    explanation?: string,
  ) {
    const id = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const stmt = this.db.prepare(`
      INSERT INTO quiz_history (id, session_id, question, is_correct, is_dont_know, user_note, explanation, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      sessionId,
      question,
      isCorrect ? 1 : 0,
      isDontKnow ? 1 : 0,
      userNote || null,
      explanation || null,
      Date.now(),
    );
  }

  public recordConceptMastery(topic: string, concept: string, isUnconditionalTruth: boolean) {
    const id = `concept-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const stmt = this.db.prepare(`
      INSERT INTO concept_mastery (id, topic, concept, is_unconditional_truth, status, mastered_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, topic, concept, isUnconditionalTruth ? 1 : 0, "mastered", Date.now());
  }

  public getSessions(): SessionRow[] {
    const stmt = this.db.prepare(`SELECT * FROM sessions ORDER BY updated_at DESC`);
    return stmt.all() as unknown as SessionRow[];
  }

  public getSessionMessages(sessionId: string): MessageRow[] {
    const stmt = this.db.prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC`);
    return stmt.all(sessionId) as unknown as MessageRow[];
  }

  public getQuizStats(): { total: number; correct: number; dontKnow: number } {
    const totalStmt = this.db.prepare(`SELECT COUNT(*) as count FROM quiz_history`);
    const correctStmt = this.db.prepare(`SELECT COUNT(*) as count FROM quiz_history WHERE is_correct = 1`);
    const dontKnowStmt = this.db.prepare(`SELECT COUNT(*) as count FROM quiz_history WHERE is_dont_know = 1`);

    const total = (totalStmt.get() as any)?.count || 0;
    const correct = (correctStmt.get() as any)?.count || 0;
    const dontKnow = (dontKnowStmt.get() as any)?.count || 0;

    return { total, correct, dontKnow };
  }

  public close() {
    this.db.close();
  }
}
