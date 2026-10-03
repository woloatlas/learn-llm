import * as fs from "node:fs";
import * as path from "node:path";
import { type TeachingSession } from "../../core/engine/session.ts";
import { type QuizGradeResult } from "../../core/quiz/types.ts";
import { type AskUserQuestionResult } from "../../core/question/types.ts";
import { type ArtifactStore } from "./artifacts.ts";

export class MarkdownLogger {
  private logFilePath: string;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(store: ArtifactStore, topic: string) {
    const slug =
      topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "lesson";

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${slug}-${dateStr}-${Date.now().toString().slice(-4)}.md`;
    this.logFilePath = path.join(store.getNotesDir(), filename);

    // Initial header
    const initialHeader = `# Lesson: ${topic}\n*Session started: ${new Date().toLocaleString()}*\n\n---\n`;
    fs.writeFileSync(this.logFilePath, initialHeader, "utf8");
  }

  public getLogPath(): string {
    return this.logFilePath;
  }

  private withLock<T>(fn: () => T | Promise<T>): Promise<T> {
    const prev = this.writeLock;
    let release: () => void;
    this.writeLock = new Promise<void>((r) => {
      release = r;
    });
    return prev.then(fn).finally(() => release());
  }

  private append(block: string): void {
    if (!block.trim()) return;
    try {
      let current = "";
      if (fs.existsSync(this.logFilePath)) {
        current = fs.readFileSync(this.logFilePath, "utf8");
      }
      const prefix = current.trim().length > 0 ? "\n\n" : "";
      fs.writeFileSync(this.logFilePath, current + prefix + block.trim() + "\n", "utf8");
    } catch (err) {
      console.error(`Failed to write to markdown log:`, err);
    }
  }

  /**
   * Binds this logger to a live TeachingSession to capture lesson dialogue automatically.
   */
  public attachToSession(session: TeachingSession): void {
    // 1. User messages
    session.on("user_message", async (text: string) => {
      await this.withLock(() => {
        this.append(`> [!quote] YOU\n>\n> ${text.replace(/\n/g, "\n> ")}`);
      });
    });

    // 2. Assistant chunks collected into turn blocks
    session.on("turn_complete", async (turnText: string) => {
      if (turnText && turnText.trim()) {
        await this.withLock(() => {
          this.append(turnText.trim());
        });
      }
    });

    // 3. Quiz posed
    session.on("quiz", async (quiz) => {
      const optionLines = quiz.displayedOptions.map(
        (o: { index: number; label: string }) => `> - **[${o.index}]** ${o.label}`,
      );
      const block = [
        `> [!example] QUIZ: ${quiz.question}`,
        quiz.details ? `> *${quiz.details}*\n>` : `>`,
        ...optionLines,
      ].join("\n");

      await this.withLock(() => {
        this.append(block);
      });
    });

    // 4. Quiz result
    session.on("quiz_result", async (result: QuizGradeResult) => {
      const icon = result.isDontKnow ? "❓" : result.isCorrect ? "✅" : "❌";
      const block = [
        `> [!check] QUIZ FEEDBACK ${icon}`,
        `> **Result**: ${result.feedbackText}`,
        result.note ? `> **Your note**: *"${result.note}"*` : "",
        `> **Explanation**: ${result.explanation}`,
      ]
        .filter(Boolean)
        .join("\n");

      await this.withLock(() => {
        this.append(block);
      });
    });

    // 5. Open Question result
    session.on("question_result", async (res: AskUserQuestionResult) => {
      const block = [
        `> [!question] QUESTION: ${res.question}`,
        res.answers.length > 0 ? `> **Choice**: ${res.answers.map((a) => a.label).join(", ")}` : "",
        res.customText ? `> **Response**: ${res.customText}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await this.withLock(() => {
        this.append(block);
      });
    });
  }
}
