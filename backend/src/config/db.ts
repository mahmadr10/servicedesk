import mongoose from "mongoose";
import { env } from "./env";

// Mongoose is a library that sits on top of the raw MongoDB driver and lets
// us define "schemas" (shapes for our documents, e.g. a User always has an
// email string and a role) plus get TypeScript types for them. Raw MongoDB
// has no schema at all — anything can be saved. For a team project with
// TypeScript, Mongoose's structure + validation is worth the small overhead.
export async function connectDB() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}
