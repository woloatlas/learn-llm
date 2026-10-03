# ==========================================
# Stage 1: Build React Vite Frontend
# ==========================================
FROM node:24-slim AS client-builder

WORKDIR /build/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Hardened Runtime
# ==========================================
FROM node:24-slim AS runner

WORKDIR /app

# Install headless Chromium for Mermaid diagram rendering, fonts, and dumb-init
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    dumb-init \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Configure Chromium and runtime paths
ENV CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data

# Install root dependencies
COPY package*.json ./
RUN npm install

# Copy compiled React frontend assets
COPY --from=client-builder /build/client/dist ./client/dist

# Copy backend source code, subagents, and pedagogical skills
COPY server/ ./server/
COPY agents/ ./agents/
COPY skills/ ./skills/
COPY tsconfig.json ./

# Single web port for TrueNAS / Dockge
EXPOSE 3000

# Persistent storage volume for SQLite DB, diagrams, and Obsidian notes
VOLUME ["/data"]

ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "server/src/index.ts"]
