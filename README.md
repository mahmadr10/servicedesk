# ServiceDesk

A small support-ticket system. Customers create tickets; agents triage,
assign, and resolve them, with live status updates pushed to the customer's
browser. Built as a 2-day scoped learning project.

## What was built

- **Auth**: register/login with JWT (access token only), roles `CUSTOMER` and `AGENT`, enforced server-side.
- **Tickets**: create, list (filter by status + pagination), get one, update status, assign to self — all going through a strict state machine (see below).
- **Comments**: customers and agents can both comment on a ticket.
- **Real-time**: Socket.IO pushes a `ticket:updated` event to a customer the instant an agent changes their ticket's status or assigns it — no page refresh needed.
- **Validation**: every request body/params/query is checked with Zod before it reaches business logic.
- **Centralized error handling**: every error response is `{ success: false, error: { code, message } }` — no raw stack traces ever reach the client.
- **Architecture**: routes → controllers → services → models. Controllers are thin; all business logic (including the state machine) lives in the service layer, where it's directly unit-testable.
- **Tests**: Vitest tests for the ticket state machine logic (`backend/src/services/ticketService.test.ts`) — the highest-value place to test, since the whole app depends on this rule being correct.

## The ticket state machine

```
OPEN → TRIAGED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
```

Only the single next step is ever legal — no skipping ahead, no going
backwards, enforced in `ticketService.isLegalTransition()`. An illegal
attempt (e.g. OPEN straight to RESOLVED) returns:

```json
{ "success": false, "error": { "code": "INVALID_STATUS_TRANSITION", "message": "..." } }
```

"Assign to self" is the specific action that moves a ticket from `TRIAGED`
to `ASSIGNED` (that's why `ASSIGNED` sits right after `TRIAGED` in the
chain) — so a ticket must be triaged before an agent can pick it up.

## Project structure

```
backend/    Node + Express + TypeScript API server
frontend/   React + TypeScript + Vite web app
```

Two separate programs — run each in its own terminal.

## Running it locally

### 1. MongoDB Atlas

You need a free MongoDB Atlas cluster and its connection string:

1. Sign up / log in at https://cloud.mongodb.com
2. Create a free (M0) cluster.
3. Under **Database Access**, create a database user (username + password).
4. Under **Network Access**, allow your current IP (or `0.0.0.0/0` for this demo — not for production).
5. Click **Connect → Drivers**, copy the connection string, and replace `<password>` with your database user's password.

### 2. Backend

```bash
cd backend
cp .env.example .env   # then paste your real MONGODB_URI and set a JWT_SECRET
npm install
npm run dev
```

Server runs on http://localhost:4000 (health check: `/api/health`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite prints the local URL (usually http://localhost:5173).

### 4. Try it

1. Register a **Customer** account and a separate **Agent** account (two browser tabs / one incognito).
2. As the customer: create a ticket.
3. As the agent: open the Ticket Queue, move the ticket `OPEN → TRIAGED`, then **Assign to me**.
4. Watch the customer's ticket view — it updates live, no refresh.
5. Continue moving the ticket through `IN_PROGRESS → RESOLVED → CLOSED` as the agent.

## Environment variables (backend/.env)

| Variable        | Meaning                                                    |
|-----------------|-------------------------------------------------------------|
| PORT            | Port the API server listens on (default 4000)                |
| MONGODB_URI     | MongoDB Atlas connection string                              |
| JWT_SECRET      | Secret key used to sign login tokens — any long random string |
| FRONTEND_ORIGIN | The frontend's URL, for CORS (default http://localhost:5173)  |

## Running tests

```bash
cd backend
npm test
```

## What was intentionally left out of scope, and why

This is a 2-day scoped build, so several things a real product would need
were deliberately skipped: an **Admin role** and analytics dashboard, an
**audit log UI**, **SLA countdowns**, **file uploads**, **notifications**
(email/Slack), **2FA**, and **refresh token rotation** (our JWT is a single
7-day access token — simpler, but it means a session can't be silently
revoked before it expires, and a user must log in again after 7 days). None
of these were needed to demonstrate the core flow — auth, a role-enforced
state machine, and real-time updates — which was the point of this build.
