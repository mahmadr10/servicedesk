import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("4000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required — check your .env file"),
  // Separate secrets for access vs refresh tokens: if one ever leaked, the
  // other token type stays safe — they're independently rotatable.
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required — check your .env file"),
  JWT_REFRESH_COOKIE_NAME: z.string().default("refreshToken"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),

  // Observability (OpenTelemetry) — all optional, all defaulted, so the app
  // runs identically whether or not any of this is configured. Read directly
  // via process.env in observability/tracing.ts too (that file must init
  // BEFORE this module's dotenv.config() import chain even matters for
  // instrumentation timing reasons), but declared here as well so they show
  // up in the one place the rest of the app's config lives, and so a typo'd
  // value fails fast at startup like every other env var does.
  OTEL_ENABLED: z.enum(["true", "false"]).default("true"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_METRICS_PORT: z.string().default("9464"),
  OTEL_SERVICE_NAME: z.string().default("servicedesk-backend"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid or missing environment variables:");
  console.error(parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"));
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
