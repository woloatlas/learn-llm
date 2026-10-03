import Fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";
import * as path from "node:path";
import * as fs from "node:fs";
import { ArtifactStore } from "../services/storage/artifacts.ts";
import { VisualInspector } from "../services/vision/inspector.ts";
import { MarkdownLogger } from "../services/storage/markdown-logger.ts";
import { CentralToolDispatcher } from "../core/tools/registry.ts";
import { AgentRegistry } from "../core/agents/registry.ts";
import { SubagentRunner } from "../core/agents/runner.ts";
import { TeachingSession } from "../core/engine/session.ts";
import { GeminiProvider } from "../llm/gemini.ts";
import { MockLLMProvider } from "../llm/mock.ts";
import { type ILLMProvider } from "../llm/types.ts";
import { SQLiteDatabase } from "../services/storage/database.ts";
import { KnowledgeGraphService } from "../services/storage/knowledge-graph.ts";
import { ObsidianExporter } from "../services/storage/obsidian-exporter.ts";

export interface ServerOptions {
  port?: number;
  dataDir?: string;
  mockMode?: boolean;
}

export function createServer(options: ServerOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const store = new ArtifactStore(options.dataDir);
  const inspector = new VisualInspector();
  const toolDispatcher = new CentralToolDispatcher(store, inspector);
  const db = new SQLiteDatabase(options.dataDir ? path.join(options.dataDir, "learn.db") : undefined);
  const knowledgeGraph = new KnowledgeGraphService(options.dataDir ? path.join(options.dataDir, "learn.db") : undefined);
  const exporter = new ObsidianExporter(store);

  // 1. Enable CORS & WebSockets
  app.register(cors, { origin: true });
  app.register(websocket);

  // 2. Serve published diagrams from /api/viz/
  app.register(fastifyStatic, {
    root: path.resolve(store.getVizDir()),
    prefix: "/api/viz/",
    decorateReply: false,
  });

  // 3. Serve production React build if client/dist exists
  const clientDist = path.resolve(process.cwd(), "client", "dist");
  if (fs.existsSync(clientDist)) {
    app.register(fastifyStatic, {
      root: clientDist,
      prefix: "/",
      decorateReply: false,
    });
  }

  // 4. REST Endpoints
  app.get("/api/health", async () => {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
  });

  app.get("/api/stats", async () => {
    return db.getQuizStats();
  });

  app.get("/api/sessions", async () => {
    return { sessions: db.getSessions() };
  });

  app.get("/api/notes", async () => {
    const notesDir = store.getNotesDir();
    if (!fs.existsSync(notesDir)) return { notes: [] };
    const files = fs
      .readdirSync(notesDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({
        filename: f,
        createdAt: fs.statSync(path.join(notesDir, f)).birthtime,
      }));
    return { notes: files };
  });

  app.get("/api/notes/:filename", async (req, reply) => {
    const { filename } = req.params as { filename: string };
    const safeName = path.basename(filename);
    const filePath = path.join(store.getNotesDir(), safeName);
    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: "Note not found" });
    }
    const content = fs.readFileSync(filePath, "utf8");
    return { filename: safeName, content };
  });

  app.get("/api/knowledge-graph", async () => {
    return knowledgeGraph.getGraphData();
  });

  app.get("/api/review", async () => {
    return { reviews: knowledgeGraph.getDueReviews() };
  });

  app.post("/api/export/vault", async () => {
    return exporter.exportVault();
  });

  // 5. WebSocket Real-Time Connection
  app.register(async (fastify) => {
    fastify.get("/ws", { websocket: true }, (rawSocket: any, req) => {
      const socket = rawSocket.socket || rawSocket;
      let session: TeachingSession | null = null;
      let currentSessionId: string | null = null;
      let logger: MarkdownLogger | null = null;

      const send = (msg: Record<string, unknown>) => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify(msg));
        }
      };

      const initSession = async (topic: string) => {
        console.log(`[WebSocket] Initializing Socratic session for topic: "${topic}"`);
        let llm: ILLMProvider;
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (apiKey && !options.mockMode) {
          llm = new GeminiProvider({ apiKey });
        } else {
          // Interactive mock provider for offline or testing
          llm = new MockLLMProvider(async (messages) => {
            if (messages.length <= 1) {
              return {
                text: `Welcome! Let's build a solid mental model of "${topic}". First, let's bracket your foundational knowledge:`,
                toolCalls: [
                  {
                    name: "quiz",
                    args: {
                      question: `Which fundamental principle governs "${topic}"?`,
                      options: [
                        { label: "Discrete rule-based structure", value: "discrete" },
                        { label: "Pure random chance", value: "random" },
                      ],
                      correctAnswer: "discrete",
                      explanation: "All robust concepts bottom out in deterministic, verifiable foundations.",
                    },
                  },
                ],
              };
            }
            return {
              text: `Now that we locked in the foundation, let's trace the motivated discovery path...`,
            };
          });
        }

        const registry = new AgentRegistry();
        const runner = new SubagentRunner(registry, llm, async (name, args) => {
          return toolDispatcher.execute(name, args);
        });

        const sessionId = `sess-${Date.now()}`;
        currentSessionId = sessionId;
        db.createSession(sessionId, topic);

        session = new TeachingSession(llm, runner, { topic });
        logger = new MarkdownLogger(store, topic);
        logger.attachToSession(session);

        // Bind Session Events to WebSocket
        session.on("chunk", (text) => send({ type: "chunk", text }));
        session.on("thought", (text) => send({ type: "thought", text }));
        session.on("quiz", (data) => send({ type: "quiz", data }));
        session.on("quiz_result", (data) => {
          db.saveQuizResult(
            sessionId,
            data.question,
            data.isCorrect,
            data.isDontKnow,
            data.note,
            data.explanation,
          );
          send({ type: "quiz_result", data });
        });
        session.on("question", (data) => send({ type: "question", data }));
        session.on("question_result", (data) => send({ type: "question_result", data }));
        session.on("subagent_event", (evt) => send({ type: "subagent_event", event: evt }));
        session.on("turn_complete", (text) => {
          db.saveMessage(`msg-${Date.now()}`, sessionId, "teacher", text);
          send({ type: "turn_complete", text });
        });
        session.on("error", (err) => {
          console.error("[Session Error]", err);
          send({ type: "error", message: String(err) });
        });

        send({
          type: "session_created",
          sessionId,
          topic,
          notePath: logger.getLogPath(),
        });

        // Kick off the initial pedagogical turn
        const initialPrompt = `I want to learn about: ${topic}`;
        db.saveMessage(`msg-${Date.now()}`, sessionId, "user", initialPrompt);
        session.sendUserMessage(initialPrompt).catch((err) => {
          console.error("[Teacher Run Error]", err);
          send({ type: "error", message: `Teaching engine error: ${String(err)}` });
        });
      };

      socket.on("message", async (raw: Buffer) => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.type === "init_session") {
            await initSession(data.topic || "General Learning");
          } else if (data.type === "user_message" && session) {
            if (currentSessionId) {
              db.saveMessage(`msg-${Date.now()}`, currentSessionId, "user", data.text);
            }
            await session.sendUserMessage(data.text);
          } else if (data.type === "submit_quiz" && session) {
            await session.submitQuiz(data.submission);
          } else if (data.type === "submit_question" && session) {
            await session.submitQuestion(data.submission);
          }
        } catch (err) {
          console.error("[WS Message Error]", err);
          send({ type: "error", message: `Message handling error: ${String(err)}` });
        }
      });
    });
  });

  return app;
}

