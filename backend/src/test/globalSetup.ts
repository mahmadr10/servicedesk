import { MongoMemoryServer } from "mongodb-memory-server";

// This is Vitest's "globalSetup" hook — code that runs exactly once before
// ANY test file is imported, in time to set environment variables the rest
// of the app depends on. We start a real (but temporary, in-memory) MongoDB
// server here instead of mocking the database, so integration tests
// exercise the actual Mongoose queries/indexes/validation, not a fake.
export default async function setup() {
  const mongod = await MongoMemoryServer.create();

  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = mongod.getUri("servicedesk_test");
  process.env.JWT_ACCESS_SECRET = "test-only-secret-do-not-use-in-production";
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";

  // The returned function is Vitest's teardown — runs once after the whole
  // test run finishes, so the in-memory server's process is cleaned up
  // instead of lingering.
  return async () => {
    await mongod.stop();
  };
}
