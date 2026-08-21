import express from "express";
import cors from "cors";
import { createServer } from "http";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { initSockets } from "./sockets";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

async function main() {
  await connectDB();

  const app = express();
  app.use(cors({ origin: env.FRONTEND_ORIGIN }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, message: "ServiceDesk backend is running" });
  });

  app.use("/api", routes);

  // Must be registered AFTER all routes — catches unmatched routes, then
  // any error thrown/passed anywhere above.
  app.use(notFoundHandler);
  app.use(errorHandler);

  // We create a plain Node http.Server wrapping the Express app instead of
  // calling app.listen() directly, because Socket.IO needs to attach to the
  // same underlying server to share the same port.
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
