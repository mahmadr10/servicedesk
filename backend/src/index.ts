import { createServer } from "http";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { seedDefaults } from "./config/seed";
import { initSockets } from "./sockets";
import { createApp } from "./app";

async function main() {
  await connectDB();
  await seedDefaults();

  const app = createApp();
  const httpServer = createServer(app);
  initSockets(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
