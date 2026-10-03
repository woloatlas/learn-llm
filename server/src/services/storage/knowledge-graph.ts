import { DatabaseSync } from "node:sqlite";
import * as path from "node:path";
import * as fs from "node:fs";

export interface GraphNode {
  id: string;
  label: string;
  type: "axiom" | "derived" | "goal";
  topic: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface ReviewItem {
  id: string;
  topic: string;
  question: string;
  correctAnswer: string;
  explanation: string;
  nextReviewAt: number;
}

export class KnowledgeGraphService {
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
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS unconditional_truths (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        statement TEXT NOT NULL,
        verified_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS diagnosed_misconceptions (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        concept TEXT NOT NULL,
        misconception_text TEXT NOT NULL,
        diagnostic_explanation TEXT NOT NULL,
        detected_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS spaced_reviews (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        question TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT NOT NULL,
        last_reviewed_at INTEGER NOT NULL,
        interval_days INTEGER NOT NULL,
        next_review_at INTEGER NOT NULL
      );
    `);
  }

  public recordAxiom(topic: string, statement: string) {
    const id = `axiom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const stmt = this.db.prepare(`
      INSERT INTO unconditional_truths (id, topic, statement, verified_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, topic, statement, Date.now());
    return id;
  }

  public recordMisconception(topic: string, concept: string, text: string, explanation: string) {
    const id = `misc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const stmt = this.db.prepare(`
      INSERT INTO diagnosed_misconceptions (id, topic, concept, misconception_text, diagnostic_explanation, detected_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, topic, concept, text, explanation, Date.now());
    return id;
  }

  public scheduleReview(topic: string, question: string, correctAnswer: string, explanation: string, intervalDays = 3) {
    const id = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const nextReview = now + intervalDays * 24 * 60 * 60 * 1000;

    const stmt = this.db.prepare(`
      INSERT INTO spaced_reviews (id, topic, question, correct_answer, explanation, last_reviewed_at, interval_days, next_review_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, topic, question, correctAnswer, explanation, now, intervalDays, nextReview);
    return id;
  }

  public getDueReviews(): ReviewItem[] {
    const now = Date.now();
    const stmt = this.db.prepare(`
      SELECT id, topic, question, correct_answer as correctAnswer, explanation, next_review_at as nextReviewAt
      FROM spaced_reviews
      WHERE next_review_at <= ?
      ORDER BY next_review_at ASC
      LIMIT 5
    `);
    return stmt.all(now) as unknown as ReviewItem[];
  }

  public getGraphData(): {
    nodes: GraphNode[];
    edges: GraphEdge[];
    summary: { axiomsCount: number; misconceptionsCount: number; reviewsDueCount: number };
  } {
    const axiomsStmt = this.db.prepare(`SELECT * FROM unconditional_truths ORDER BY verified_at ASC`);
    const axioms = axiomsStmt.all() as any[];

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Map axioms as root nodes
    for (const a of axioms) {
      nodes.push({
        id: a.id,
        label: a.statement,
        type: "axiom",
        topic: a.topic,
      });
    }

    const miscStmt = this.db.prepare(`SELECT COUNT(*) as count FROM diagnosed_misconceptions`);
    const reviewsStmt = this.db.prepare(`SELECT COUNT(*) as count FROM spaced_reviews WHERE next_review_at <= ?`);

    const misconceptionsCount = (miscStmt.get() as any)?.count || 0;
    const reviewsDueCount = (reviewsStmt.get(Date.now()) as any)?.count || 0;

    return {
      nodes,
      edges,
      summary: {
        axiomsCount: axioms.length,
        misconceptionsCount,
        reviewsDueCount,
      },
    };
  }

  public close() {
    this.db.close();
  }
}
