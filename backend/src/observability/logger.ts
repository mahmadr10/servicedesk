import pino from "pino";
import { isProduction } from "../config/env";

// One shared, structured logger for the whole backend. "Structured" means
// every log line is a JSON object with consistent fields (timestamp,
// level, message, plus whatever context we attach) — not free-form text.
// That's what makes logs actually SEARCHABLE in a real deployment (e.g.
// "show me every error for userId X in the last hour") instead of just
// scrollback you read with your eyes.
//
// In development we pipe through pino-pretty for a human-readable
// colorized line-by-line view; in production we emit raw JSON (what a log
// aggregator like Datadog/CloudWatch/Grafana Loki actually wants).
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    // Defense in depth: even if a future call accidentally logs a full
    // request body or headers object, these specific paths are scrubbed to
    // "[Redacted]" rather than ever reaching a log file or log aggregator.
    paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.passwordHash", "*.token"],
    censor: "[Redacted]",
  },
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
});
