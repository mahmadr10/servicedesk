import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimit";

// Building the Express app is separated from STARTING it (index.ts) so
// integration tests can import `app` and drive it directly with Supertest —
// no real network port, no real process — while index.ts remains the only
// place that actually calls .listen() and connects to a real database.
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(generalLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, message: "ServiceDesk backend is running" });
  });

  app.use("/api/v1", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
