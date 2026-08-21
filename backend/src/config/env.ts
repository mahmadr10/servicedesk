import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Validate environment variables ONCE at startup, using the same Zod library
// we use for request validation. If something required is missing (e.g. you
// forgot to set JWT_SECRET), we want the app to fail immediately with a clear
// message — not crash mysteriously later when a route tries to use it.
const envSchema = z.object({
  PORT: z.string().default("4000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required — check your .env file"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required — check your .env file"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid or missing environment variables:");
  console.error(parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"));
  process.exit(1);
}

export const env = parsed.data;
