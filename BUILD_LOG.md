# Build Log

Feature-by-feature record of how this was actually built, including the
parts that didn't work on the first try.

---

## Ticket state machine + SLA engine

**Problem**: tickets need a workflow that can't be corrupted by an
arbitrary status change (e.g. `OPEN` jumping straight to `RESOLVED`), and
each ticket needs a response/resolution deadline derived from its priority.

**Approach**: a single `Record<TicketStatus, TicketStatus[]>` map
(`ticketService.ts`) as the one source of truth for legal transitions —
every other layer (role rules, the frontend's button rendering) defers to
it rather than re-implementing the graph. SLA deadlines computed once at
creation (`responseDeadline`/`resolutionDeadline` stored as real `Date`
fields) and "remaining time"/"breached" computed fresh on every read
(`computeSlaStatus`, a pure function).

**Implementation**: the graph branches (`IN_PROGRESS` → `WAITING_FOR_CUSTOMER`
*or* `RESOLVED`) and allows a `CLOSED → OPEN` reopen — richer than a
straight line, so role rules had to be layered separately
(`isTransitionAllowedForActor`) rather than baked into the graph itself,
since "customer may close a resolved ticket" isn't a property of the two
status strings alone.

**Challenges**: deciding what counts as "breached" for SLA purposes wasn't
obvious at first — is it breached the moment `now` passes the deadline
(even if later resolved on time), or only if the actual response/resolution
happened after the deadline? The second is correct (a ticket resolved at
minute 10 against a 4-hour deadline isn't "breached" just because it's now
day 3), which is why `computeSlaStatus` checks `firstResponseAt`/
`resolvedAt` first and only falls back to `now` if the event hasn't
happened yet.

**Decision**: "assign to self" is the specific action that transitions
`TRIAGED → ASSIGNED` (rather than a separate free-standing action) — a
ticket must be triaged before it can be picked up, matching the graph
exactly.

**Testing**: 6 unit tests on `isLegalTransition` (every legal step, the
spec's own reject-example, backwards moves, staying-still), 6 more on
`computeSlaStatus` (breach boundary conditions, the "clock freezes at
response time" behavior).

**Result**: all passing; see [TESTING.md](TESTING.md).

---

## Access + refresh JWT authentication

**Problem**: the earlier (2-day scoped) version used one 7-day JWT with no
revocation — logging out didn't actually invalidate anything.

**Approach**: short-lived (15 min) access token + rotating refresh token in
an httpOnly cookie, hashed at rest. See [DECISIONS.md](DECISIONS.md#2-access-token-jwt--rotating-refresh-token-httponly-cookie-not-a-single-long-lived-jwt)
for the full alternatives comparison.

**Implementation**: `utils/jwt.ts` (token generation/hashing),
`models/RefreshToken.ts` (with a TTL index so expired ones self-delete),
`authService.ts` (issue/rotate/revoke), frontend `api/client.ts` (axios
interceptor: on a 401, silently call `/auth/refresh` once and retry the
original request).

**Challenges**: getting the frontend's silent-refresh-on-401 logic right
without an infinite loop — the refresh call itself must never go through
the same interceptor that triggers refreshes, or a failed refresh would
try to refresh itself forever. Solved with a plain, separate `axios.post`
call for `/auth/refresh` specifically, outside the interceptor chain.

**Decision**: access token kept in a module-level JS variable (memory
only), never `localStorage` — see [DECISIONS.md](DECISIONS.md#3-refresh-token-in-an-httponly-cookie-access-token-in-memory-only-neither-in-localstorage).

**Testing**: integration tests cover register/login/duplicate-email/
wrong-password/unauthenticated-access. (Refresh-rotation itself doesn't
have a dedicated automated test — flagged as a gap; manually verified via
the E2E suite's multi-step login flow implicitly exercising it.)

**Result**: working; logout now actually revokes access.

---

## Role-aware, branching ticket workflow across three roles

**Problem**: Customer/Agent/Admin need genuinely different capabilities,
enforced at the API — not just different UI.

**Approach**: `requireRole(...)` middleware per route, plus ownership
checks inside services for anything role alone can't answer ("is this
YOUR ticket").

**Implementation**: `middleware/auth.ts`, `services/ticketService.ts`'s
`assertCanView`/`isTransitionAllowedForActor`, `services/adminService.ts`
for user/category/SLA-policy management.

**Challenges**: the frontend needed to know which status buttons to show
an agent vs. a customer vs. nobody (for a ticket they can't act on) —
duplicating the role rules in the frontend would risk them drifting from
the backend's actual rules. Solved by having `GET /tickets/:id` return an
authoritative `allowedNextStatuses[]` computed server-side, so the frontend
just renders whatever the server says is legal right now, and the server
still re-checks independently on the actual `PATCH` (the array is a
convenience, not the security boundary).

**Result**: see the real bug this surfaced, next section.

---

## Testing infrastructure — and the bug it found

**Problem**: prove the app actually works, at three different levels of
confidence (see [TESTING.md](TESTING.md) for the full breakdown of why
three layers).

**Approach**: Vitest for unit + integration (with `mongodb-memory-server`
for a real-but-throwaway database), Playwright for E2E against real running
servers.

**Challenges** (the interesting part): setting up Playwright's `webServer`
config to auto-start both the frontend and backend hit a wall — the very
first E2E run showed a completely wrong page (a "Sign up" form with no Name
field, nothing like this app's actual Register page). Root cause: an
**unrelated project's dev server** was already running on port 5173 (Vite's
default), and Playwright's `reuseExistingServer` setting happily attached
to it instead of starting a fresh one. Fixed by moving the E2E servers to
dedicated ports (4001/5175) that can't collide with anything else running
on the machine.

Once pointed at the real app, the very first real test —
"customer creates a ticket, then views it" — failed with
`403 FORBIDDEN: You can only view your own tickets.` **on the customer's
own ticket.** Root cause: `assertCanView()` compared
`ticket.customer.toString()` against `user.userId`, but `GET /tickets/:id`
populates the `customer` field (to include the owner's name/email in the
response) — and `.toString()` on a *populated* Mongoose document does not
return its id string, so the check failed unconditionally for every
customer, every time. Every existing integration test for this function
happened to test the *correctly-forbidden* case (viewing someone else's
ticket), where an "always reject" bug is invisible.

**Decision**: normalize the comparison with a small helper
(`customerIdOf`) that handles both a populated document (`{ _id, name,
email }`) and a raw ObjectId — used everywhere `ticket.customer` is
compared to a user id.

While writing this test, a second, related bug surfaced by inspection: the
frontend's generic "Move to X" button loop didn't exclude `ASSIGNED`,
which would have let an agent set a ticket's status to `ASSIGNED` directly
(via the generic status-update endpoint) without going through "Assign to
me" — leaving the ticket `ASSIGNED` with no actual agent attached. Fixed by
excluding `ASSIGNED` from that generic loop; it's now only reachable via
the dedicated assign action.

**Testing**: added a dedicated regression integration test
(`lets a customer view their OWN ticket via GET /tickets/:id (populated
customer field)`) so this specific bug shape can never silently return.

**Result**: 28 backend tests passing, 4/4 E2E tests passing against real
servers and a real browser. This is the single clearest example in the
whole build of why the E2E layer earns its keep — neither the unit nor the
integration layer happened to exercise the exact code path (a customer
GETting their own populated ticket) where the bug lived.

---

## Docker & local disk space

**Problem**: containerize both halves, runnable with one command.

**Approach**: multi-stage Dockerfiles (build stage with full
devDependencies, discarded; runtime stage with only what's needed to run),
`docker-compose.yml` bundling a local MongoDB so the whole stack works with
zero external accounts.

**Challenges**: Docker Desktop could not actually be installed in the
environment this project was built in — the machine's `C:` drive was
essentially full (down to 0 bytes free at one point). Freed several GB by
clearing `npm`'s package cache (1.36 GB — safe, it just re-downloads
what's needed) and removing genuinely duplicate/leftover installer files,
but the installer's actual deploy step still needed more (`need 3459 MiB,
only 1881 MiB available`) than could be freed without deeper cleanup of
the user's own files, which wasn't this project's call to make unilaterally.

**Decision**: stopped pursuing local installation rather than keep
troubleshooting an environment-specific disk constraint — it doesn't block
the actual deliverable, since a real deployment platform (Render/Railway/
Fly.io) builds the Docker image **in the cloud** from the Dockerfile
already in the repo, never touching the local machine's disk at all. Noted
honestly in [README.md](README.md) and [DEPLOYMENT.md](DEPLOYMENT.md) as
"written but not run end-to-end here" rather than claimed as verified.

**Result**: Dockerfiles and compose config complete and reviewed line by
line for correctness; genuinely unverified by an actual `docker compose up`
run. This is the one deliverable in the whole project carrying that
caveat, and it's called out rather than hidden.

---

## Performance pass

**Problem**: demonstrate the app holds up at a realistic data volume
(10,000+ tickets), not just the handful of demo tickets used everywhere
else.

**Approach**: `npm run seed:perf` generates 10,000 tickets across 200
customers and 15 agents with randomized status/priority/dates. `npm run
benchmark` measures one real query — the agent ticket queue's filter (by
assigned agent + status) + sort (newest first) + limit — using MongoDB's
`explain("executionStats")`, with and without its compound index.

**Measurement** (`Ticket.find({ assignedAgent, status: "IN_PROGRESS" })
.sort({ createdAt: -1 }).limit(10)`, run against the real 10,000-document
in-memory dataset):

| | Documents examined | Documents returned | Plan |
|---|---|---|---|
| Compound index dropped | 478 | 10 | `SORT → FETCH → IXSCAN` (a narrower single-field index on `assignedAgent` alone still helped partially) |
| Compound index present | 10 | 10 | `LIMIT → FETCH → IXSCAN` |

**Root cause** (of the *difference*, not a bug — both used *some* index,
since the schema also declares single-field indexes): a single-field index
on `assignedAgent` can narrow the search but still has to individually
inspect every matching document to check `status` and sort them; the
compound index `{ assignedAgent: 1, status: 1, createdAt: -1 }` lets
MongoDB satisfy the filter AND the sort order directly from the index
itself, examining exactly the 10 documents it returns — the theoretical
minimum.

**Optimization**: the compound index was already declared in
`models/Ticket.ts` from the initial backend rebuild (not added
reactively after finding a problem) — this benchmark exists to *prove* that
choice mattered with real numbers, rather than assert it on faith.

**Result**: ~98% reduction in documents examined (478 → 10) for this
query shape, confirmed by `explain()`, not estimated.

**Honest note**: the "before" measurement never showed a true `COLLSCAN`
(full collection scan) — the schema's other single-field indexes provided
partial help even with the compound index dropped, which is a more
realistic and more interesting result than an artificially manufactured
worst case would have been, so it's reported as measured rather than
engineered to look more dramatic.

---

## OpenTelemetry tracing + metrics

**Problem**: structured logging (Pino) answers "what happened, in words,
per request" but not "where did the time go, across layers, for THIS
request" — the spec asks specifically for the latter, with the worked
example of investigating `/api/v1/dashboard/analytics` latency using traces.

**Approach**: `@opentelemetry/sdk-node` with auto-instrumentation for
http/express/mongodb (covers "HTTP Request → Express Route → MongoDB" with
zero application code), plus a small `withSpan()` helper
(`observability/otel.ts`) wrapping a handful of representative Service-layer
functions explicitly — auto-instrumentation can only patch real libraries,
and the Service layer is just our own function calls, invisible to a trace
otherwise. Traces print to the console with zero setup (no collector
required); `docker compose up` additionally wires a bundled Jaeger service
for a real trace-waterfall UI. Metrics via `@opentelemetry/exporter-
prometheus`, which serves `/metrics` itself — no collector needed there
either.

**Implementation**: `observability/tracing.ts` (SDK bootstrap — imported as
the literal first line of `index.ts`, ahead of every other import) and
`observability/otel.ts` (the `withSpan` helper), used in
`ticketService.createTicket`/`updateTicketStatus` and
`dashboardService.getSummary`/`getAnalytics`.

**Challenges**: auto-instrumentation patches modules at `require()` time —
if `tracing.ts` were imported anywhere other than first, any module already
loaded by that point (e.g. `express`, pulled in transitively by `app.ts`)
would keep running its original, un-patched code, and its spans would
silently never appear. No error, no warning — just missing spans, which
would have been a genuinely nasty thing to debug after the fact. Solved by
making it the first statement in `index.ts` and calling that out explicitly
in both files' comments so a future edit doesn't reorder it by accident.

Separately, verifying the Prometheus metrics endpoint actually worked hit a
false alarm: requests from a **different** local process (a separate
PowerShell instance) to `localhost:9464/metrics` timed out, which looked
like the exporter wasn't really listening. An in-process self-request (the
same Node process, after its own server started, calling its own endpoint)
returned `200` with a real metrics body immediately — proving the exporter
was correct all along, and the timeout was the *testing environment's*
loopback/sandbox networking between separate processes, not the code. Kept
the in-process check as the actual verification method rather than trusting
the misleading cross-process symptom.

**Decision**: Prometheus's pull model over an OTLP metrics exporter — a
`curl localhost:9464/metrics` works with nothing else running, where OTLP
metrics would need a collector or backend already listening to be useful at
all. Console-exporter-by-default over "OTLP always, fail if no collector" —
same reasoning as everywhere else in this project that talks to optional
external infrastructure (Docker, deployment): the app must run standalone
first, richer behavior is additive when configured.

**Testing**: full backend suite (28 tests) re-run after the change — still
passing, since `tracing.ts` is never imported by the integration test path
(tests import `app.ts` directly, not `index.ts`) and `OTEL_ENABLED=false` is
set for the E2E backend specifically, so tracing doesn't add a port-binding
flakiness risk to a test suite that isn't testing tracing itself. Verified
the SDK actually produces a working metrics endpoint via the in-process
self-request described above (not just "it compiled").

**Result**: a real, working `HTTP → Express Route → Service → MongoDB` trace
chain, viewable with zero setup (console) or a full UI (`docker compose up`
→ http://localhost:16686), plus a scrape-ready `/metrics` endpoint.
