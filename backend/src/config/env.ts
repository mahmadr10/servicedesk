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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid or missing environment variables:");
  console.error(parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"));
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
