import "dotenv/config";
import { createServer } from "./api/server.ts";

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

const app = createServer();

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }
  console.log(`\n🚀 Learn-LLM Server running at: ${address}`);
  console.log(`   - REST API: ${address}/api/health`);
  console.log(`   - WebSocket: ${address.replace("http", "ws")}/ws`);
  console.log(`   - Diagrams: ${address}/api/viz/\n`);
});

