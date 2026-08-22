// Playwright's E2E tests need a REAL backend listening on a REAL port (not
// the in-memory Supertest approach the integration tests use) — this
// script is what Playwright's `webServer` config runs to get one. It
// starts a throwaway in-memory MongoDB (same tool the backend's own
// integration tests use — see backend/src/test/globalSetup.ts) and then
// launches the actual backend dev server pointed at it, so E2E runs never
// need a real Atlas connection or touch real data.
//
// Uses port 4001 (not the usual 4000) specifically so it can never collide
// with a real backend dev server you might already have running locally —
// learned the hard way when Playwright's frontend port collided with an
// unrelated project's dev server on the default port.
const { MongoMemoryServer } = require("mongodb-memory-server");
const { spawn } = require("child_process");
const path = require("path");

async function main() {
  const mongod = await MongoMemoryServer.create();

  const backendDir = path.join(__dirname, "..", "..", "backend");
  const child = spawn("npm", ["run", "dev"], {
    cwd: backendDir,
    shell: true,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: "4001",
      MONGODB_URI: mongod.getUri("servicedesk_e2e"),
      JWT_ACCESS_SECRET: "e2e-test-secret-not-for-production",
      FRONTEND_ORIGIN: "http://localhost:5175",
      LOG_LEVEL: "warn",
    },
  });

  const shutdown = async () => {
    child.kill();
    await mongod.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
