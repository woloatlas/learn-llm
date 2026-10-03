# Learn-LLM: Socratic Pedagogical Studio

A self-hosted, full-stack AI learning framework based on the teaching philosophy from *"[How I Use AI to Learn Things](https://www.youtube.com/watch?v=kzcI5F4tGiU)"*.

Overhauled from a terminal `.pi` configuration into a **modern, containerized web application** powered by **Google Gemini**, **React 19**, and **Fastify**, ready for one-click deployment on **TrueNAS via Dockge**.

---

## Key Features

* **Socratic Pedagogical Engine**: Builds a mental dependency graph (DAG) in the learner's mind based on two immutable principles:
  1. *Unconditional Truths First*: Core bedrock facts locked in without caveats before building on them.
  2. *Motivated Discovery ("How could I have discovered this?")*: 3Blue1Brown-style motivated inquiry over arbitrary decrees.
* **Interactive Web-UI Cards**:
  * **Quiz Cards**: Immediate feedback ($\checkmark$ / $\times$), correct answers, and first-principles explanations.
  * **"I Don't Know" Button**: A distinct signal for honest knowledge boundaries to bracket the learner's zone of proximal development without guessing.
  * **Learner Notes**: Capture your mental model or diagnostic thinking.
  * **Decision Modals**: Branching path selection and open-ended goal setting.
* **Rich Math & Diagram Rendering**:
  * **KaTeX Math Engine**: Native inline ($f(x)$) and centered display ($\$\$\dots\$\$$) math rendering.
  * **Live Dependency DAG Visualizer**: Real-time Mermaid graph in the sidebar tracking your progress from foundation to target understanding.
  * **Autonomous Visual Verification**: Specialized subagents (`mermaid-maker`, `svg-maker`) author diagrams, render them to PNG via headless Chromium, and **inspect them using Gemini multimodal vision** to fix inverted arrows or cluttered text before publishing.
* **100% Free Live Search Grounding**: `researcher` subagent uses Gemini's native Google Search grounding to retrieve real-world citations and primary sources at zero extra cost.
* **Zero-Config SQLite Persistence**: All sessions, messages, quiz scores, and concept mastery persist in `/data/learn.db` using Node.js's native `node:sqlite`.
* **Obsidian-Ready Notes & Vault Export**: Sessions automatically format into Obsidian callout notes (`> [!quote]`, `> [!example]`, `> [!check]`) and can be exported as a full Obsidian Vault package with one click.

---

## System Architecture

```
                    ┌─────────────────────────────────────────┐
                    │        Browser (React 19 + Vite)        │
                    │   Streaming Chat + Quizzes + Live DAG   │
                    └────────────────────┬────────────────────┘
                                         │ WebSockets & REST (:3000)
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                        Self-Hosted Docker Container                             │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                 Fastify Server & Socratic Orchestrator                  │   │
│   │             (Probe Edge -> Formulate Plan -> Teach Loop)                │   │
│   └───────────────┬───────────────────────────────┬─────────────────────────┘   │
│                   │                               │                             │
│         ┌─────────▼────────┐             ┌────────▼────────┐                    │
│         │ Google Gemini AI │             │   Subagent Mgr  │                    │
│         │ (2.0 Flash / Pro)│             │ (No tmux needed)│                    │
│         └─────────┬────────┘             └────────┬────────┘                    │
│                   │ Google Search                 │ In-Process                  │
│                   │ Grounding            ┌────────▼────────┐                    │
│                                          │ Headless Chrome │                    │
│                                          │  & Resvg Render │                    │
│                                          └────────┬────────┘                    │
└───────────────────────────────────────────────────┼─────────────────────────────┘
                                                    │
                                           ┌────────▼────────┐
                                           │ Mounted Volume  │
                                           │     (/data)     │
                                           │   SQLite + Viz  │
                                           └─────────────────┘
```

---

## Quick Start (Local Development)

### Prerequisites
* **Node.js**: v22+ or v24+
* **Google Gemini API Key**: Free at [Google AI Studio](https://aistudio.google.com/)

### 1. Setup Environment
```bash
git clone https://github.com/cjw92/learn-llm.git
cd learn-llm
npm install
npm --prefix client install
```

Copy `.env.example` to `.env` and add your Gemini API key:
```bash
cp .env.example .env
```

### 2. Run Test Suite (7 Automated Suites)
```bash
npm test
```
Runs unit and integration tests across all engine layers:
* `quiz-grader.test.ts`: Option shuffling, value-keyed validation, and "I don't know" boundaries.
* `session-runner.test.ts`: Multi-turn Socratic loop with subagent delegation.
* `visual-inspection.test.ts`: Headless Mermaid (Chromium) and SVG (`resvg`) rendering.
* `research-service.test.ts`: Web fetching and Google Search grounding.
* `web-server.test.ts`: Fastify REST and React SPA static serving.
* `database.test.ts`: Native SQLite session and quiz persistence.
* `knowledge-graph.test.ts`: Cross-session concept mastery and Obsidian vault export.

### 3. Start the Web Application
```bash
# Build React client
npm run build:client

# Start server
npm start
```
Open **`http://localhost:3000`** in your browser.

*(Optional)* You can also run an interactive terminal session anytime:
```bash
npm run start:cli
```

---

## Deployment: TrueNAS SCALE & Dockge

This platform is configured as a single container stack with a persistent volume.

### 1. Dockge Compose Setup
In your TrueNAS Dockge dashboard, create a new stack named `learn-llm` and paste the following `compose.yaml`:

```yaml
services:
  learn-llm:
    build: .
    image: learn-llm:latest
    container_name: learn-llm
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GEMINI_API_KEY=your_gemini_api_key_here
      - DATA_DIR=/data
    volumes:
      # Map to your TrueNAS dataset
      - /mnt/tank/appdata/learn-llm:/data
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
      interval: 30s
      timeout: 5s
      retries: 3
```

### 2. Deploy
Click **Deploy** in Dockge. Dockge will build the multi-stage image, install headless Chromium, compile the React SPA, and start the service on port `3000`.

---

## Project Structure

```
learn-llm/
├── client/                     # React 19 + Vite Frontend SPA
│   ├── src/
│   │   ├── components/         # Chat, QuizCard, DecisionModal, DagVisualizer, NotesDrawer
│   │   ├── hooks/              # useTeachingSession (WebSocket connection & state)
│   │   └── App.tsx             # Socratic studio layout
│   └── vite.config.ts
├── server/                     # TypeScript Backend
│   ├── src/
│   │   ├── api/                # Fastify server, REST endpoints, and WebSockets (/ws)
│   │   ├── core/
│   │   │   ├── engine/         # Socratic session orchestrator & teaching prompts
│   │   │   ├── quiz/           # Standalone quiz grader & value validator
│   │   │   ├── agents/         # In-process subagent task runner (replaces tmux)
│   │   │   └── tools/          # Subagent tool handlers (Mermaid, SVG, Research)
│   │   ├── services/
│   │   │   ├── render/         # Headless Chromium & Resvg rendering
│   │   │   ├── vision/         # Gemini multimodal visual QA inspector
│   │   │   └── storage/        # SQLite persistence, artifact store & Obsidian exporter
│   │   └── llm/                # Google Gemini SDK adapter & streaming client
│   └── tests/                  # 7 automated test suites
├── Dockerfile                  # Multi-stage container definition
├── compose.yaml                # TrueNAS Dockge deployment file
└── package.json
```

---

## Credits & License

* Originally created as a personal Pi configuration by [Amos Blomqvist](https://github.com/amosblomqvist/learn).
* Architectural overhaul, web platform, and self-hosted engine built for self-hosting with Google Gemini and TrueNAS Dockge.
* Licensed under the MIT License.
