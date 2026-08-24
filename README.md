# ServiceDesk

A production-grade multi-user support ticket platform. Customers submit
requests; support agents triage, assign, and resolve them under SLA
deadlines; administrators manage users, categories, SLA policies, and can
inspect a full audit trail. Real-time updates push status/assignment
changes to everyone watching a ticket, without a page refresh.

**Full documentation:**

| Doc | Covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System/component diagrams, data model, request lifecycle, auth flow |
| [API.md](API.md) | Every endpoint, request/response shapes, error codes |
| [SECURITY.md](SECURITY.md) | Auth model, threat mitigations, what's deliberately out of scope |
| [TESTING.md](TESTING.md) | Test strategy and how to run each layer |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Docker, CI/CD, and deploying to a live host |
| [DECISIONS.md](DECISIONS.md) | Why MongoDB, why JWT, why Socket.IO, etc. — alternatives considered |
| [BUILD_LOG.md](BUILD_LOG.md) | Feature-by-feature build log: problem → approach → challenges → result |

## What was built

- **Auth**: register/login, short-lived JWT access tokens + rotating
  httpOnly-cookie refresh tokens, logout revokes the refresh token
  server-side.
- **Roles**: Customer, Agent, Administrator — enforced at the API layer via
  middleware, not just hidden in the UI.
- **Tickets**: full CRUD, search, filter (status/priority/category/agent/tag/
  date range), sort, and server-side pagination. Attachments (Multer,
  type/size-restricted). Tags. A human-readable ticket number (`TCK-000123`).
- **State machine**: a branching, role-aware workflow —
  `OPEN → TRIAGED → ASSIGNED → IN_PROGRESS ⇄ WAITING_FOR_CUSTOMER`,
  `IN_PROGRESS → RESOLVED → CLOSED`, with `CLOSED → OPEN` reopening. Illegal
  transitions return a structured `INVALID_STATUS_TRANSITION` error, never a
  silent no-op.
- **SLA engine**: per-priority response/resolution deadlines, computed at
  ticket creation from admin-configurable policies; live "remaining time" /
  breach status, computed on every read (never stored stale).
- **Audit log**: every mutating action (create, status change, priority
  change, assignment, comment, category/SLA-policy edits) recorded with
  actor/action/entity/entityId/oldValue/newValue/timestamp — inspectable by
  admins.
- **Dashboard & analytics**: totals, SLA breach count, average resolution
  time, and bar charts (tickets by status/priority/category/agent), backed
  by MongoDB aggregation pipelines.
- **Real-time**: Socket.IO, JWT-authenticated at connection time. A
  customer's own ticket updates live; agents/admins share a room so
  reassignment is visible without a refresh.
- **Validation**: Zod on every request body/params/query, both ends.
- **Security**: password hashing (bcrypt), rate limiting, Helmet security
  headers, centralized error handling (no stack traces to the client),
  file-upload restrictions. Details in [SECURITY.md](SECURITY.md).
- **Observability**: structured JSON logging (Pino) with request ids,
  method/route/status/duration/userId on every request; errors correlate to
  logs via a `requestId` in the response. **OpenTelemetry** auto-instruments
  HTTP/Express/MongoDB, plus explicit spans around the Service layer, so a
  request traces `HTTP → Route → Service → MongoDB` end to end; a Prometheus
  metrics endpoint (`/metrics`) ships alongside it. Zero setup required
  (traces print to the console, no collector needed) — or point it at Jaeger
  (bundled in `docker compose up`, UI at http://localhost:16686) for a real
  trace waterfall. Details: [ARCHITECTURE.md](ARCHITECTURE.md#observability).
- **Testing**: Vitest unit tests (state machine, SLA math), Supertest
  integration tests (real HTTP against a real in-memory MongoDB), and a
  Playwright E2E suite driving a real browser through the full ticket
  lifecycle. See [TESTING.md](TESTING.md).
- **CI**: GitHub Actions — install → lint → typecheck → test → build, on
  every PR and push to `main`.
- **Docker**: Dockerfiles for both halves + a `docker-compose.yml` that runs
  the whole stack (including a local MongoDB) with one command.

## Project structure

```
backend/    Node + Express + TypeScript API (controller -> service -> repository -> model)
frontend/   React + TypeScript + Vite, TanStack Query + React Hook Form
e2e/        Playwright end-to-end tests (drives both halves together)
```

## Running it locally

### Option A — Docker (one command)

```bash
docker compose up
```

Frontend: http://localhost:8080 · Backend: http://localhost:4000 · a local
MongoDB is included, no Atlas account needed. Override any setting via a
root `.env` — see [.env.example](.env.example).

> Note: this was written and typechecked/reviewed carefully but not run
> end-to-end in this environment (Docker wasn't available where this was
> built) — do a `docker compose up` verification pass before relying on it.

### Option B — run each half directly

**1. MongoDB Atlas** (or any MongoDB instance): create a free cluster at
https://cloud.mongodb.com, get its connection string. Steps in
[DEPLOYMENT.md](DEPLOYMENT.md#mongodb-atlas-setup).

**2. Backend:**
```bash
cd backend
cp .env.example .env   # paste your MONGODB_URI, set a JWT_ACCESS_SECRET
npm install
npm run dev
```
Runs on http://localhost:4000. First boot auto-seeds default categories and
SLA policies. Optionally seed demo accounts: `npm run seed:users`.

**3. Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173.

**4. Try it:** register a Customer and an Agent (two browser profiles or one
incognito). Customer creates a ticket → Agent triages, assigns to self,
progresses it → both sides watch it update live → Customer closes it.

## Environment variables

See `backend/.env.example`, `frontend/.env.example`, and root
`.env.example` (Docker overrides). Full reference in
[DEPLOYMENT.md](DEPLOYMENT.md#environment-variables).

## Running tests

```bash
cd backend  && npm test    # unit + integration (Vitest + Supertest, in-memory MongoDB)
cd e2e      && npm test    # Playwright E2E (starts both servers itself)
```

Details, including how to demonstrate a failing → passing CI run, in
[TESTING.md](TESTING.md).

## Performance

```bash
cd backend
npm run seed:perf    # generates 10,000 tickets
npm run benchmark    # measures one real query with/without its index
```

Real measured results and the optimization story: [BUILD_LOG.md](BUILD_LOG.md#performance-pass).

## What was intentionally left out of scope, and why

**Not built at all**, as genuinely out of scope for this exercise: a live
AI feature (documented as a viable bonus addition, not implemented —
would need an LLM API key and is additive, not core), a Grafana dashboard on
top of the Prometheus metrics endpoint (the endpoint itself exists — wiring
an actual Grafana instance to it is one `docker-compose` service away, not
done here), and an actual live production deployment (prepared — Docker + CI
are deploy-ready — but not executed, since it needs accounts on a hosting
platform that only the project owner can create).

**Deliberately simplified**: no email/Slack notifications (Socket.IO covers
the real-time requirement), no in-app file preview (download only), no
granular per-field permission system beyond the three roles.
