# Technical Decisions

Each entry: the decision, the alternatives actually considered, why this
one won, and the honest trade-off.

## 1. MongoDB (with Mongoose) over a relational database

**Alternatives considered**: PostgreSQL (with Prisma or raw SQL).

**Why MongoDB**: the domain is document-shaped — a ticket's tags,
attachments, and SLA fields naturally live together as one record read and
written as a unit, and the schema flexes over the project's life (adding
`tags`, `attachments`, SLA fields, `firstResponseAt` etc. happened
incrementally, without a migration system). Mongoose adds schema
validation and TypeScript types on top, closing most of the gap with a
relational schema's guarantees. The spec also named MongoDB directly.

**Trade-off**: no real cross-collection transactions used in this build
(ticket creation + audit log write are two separate operations, not
atomic) — a genuine risk if the audit write failed silently between them.
Mitigated, not eliminated: `auditLogService.logAction()` catches and logs
its own failures rather than throwing, so a broken audit write can't crash
the user-facing action, but it does mean an audit entry could theoretically
be lost independent of the ticket change succeeding. A relational database
with a real transaction wrapping both writes would close this gap
completely; judged not worth the complexity here given audit failures are
logged and rare.

## 2. Access token (JWT) + rotating refresh token (httpOnly cookie), not a single long-lived JWT

**Alternatives considered**: one long-lived JWT (what an earlier, smaller
version of this project used); server-side sessions (a session id cookie +
session store, no JWT at all).

**Why this**: a single long-lived JWT can't be revoked early short of
changing the signing secret (which logs out every user at once) — so
"logout" wouldn't really mean anything, and a leaked token stays valid
until it expires regardless of what the user does. The access+refresh
split gets genuine revocation (logout deletes the refresh token's DB row
immediately) while keeping most requests fast and stateless (the
15-minute access token needs no database lookup to verify).

**Why not server-side sessions instead**: would also give real revocation,
and arguably more simply — but couples every request to a session-store
lookup (Redis, typically), which is one more moving part this project
didn't need, and JWTs are the more common expectation for an API meant to
be called by more than just this one frontend.

**Trade-off**: more moving parts than either alternative alone — two token
types, a `RefreshToken` collection, rotation logic, a cookie-scoping
decision. Directly visible in the code as the single biggest addition
between the initial 2-day scoped build (one 7-day JWT, no refresh) and
this version.

## 3. Refresh token in an httpOnly cookie, access token in memory only (neither in `localStorage`)

**Alternatives considered**: both tokens in `localStorage` (what the
initial 2-day build did, for simplicity).

**Why this**: `localStorage` is readable by any JavaScript running on the
page — if this app ever had an XSS vulnerability, a token sitting in
`localStorage` is trivially stolen by an injected script. An httpOnly
cookie is invisible to JavaScript entirely; keeping the access token only
in a page-lifetime memory variable means a stolen-via-XSS scenario still
can't extract it (nothing to read from storage — it's gone as soon as the
tab reloads, and it's *silently re-issued* via `/auth/refresh` on load,
so this is invisible to the user).

**Trade-off**: a hard page refresh loses the in-memory access token,
requiring one extra round trip (`/auth/refresh`) before the app is usable
again — a few hundred milliseconds, handled transparently in
`AuthContext`'s startup effect.

## 4. Controller → Service → Repository → Model layering

**Alternatives considered**: routes calling Mongoose models directly (no
service/repository layers at all — the simplest possible structure);
a "fat model" approach (business logic as static methods on the Mongoose
model itself).

**Why this**: the ticket state machine and SLA engine are the highest-value
code in this project to test in isolation, without spinning up Express or
a database — that's only possible if they live somewhere that doesn't
import `req`/`res` or a live Mongoose connection. The repository layer
exists specifically as the seam a service's tests COULD mock (not
currently done — the integration tests exercise the real repositories
against a real in-memory database instead, judged more valuable than
mocking) but the seam is there if a future contributor wants faster,
fully-isolated service unit tests.

**Trade-off**: more files and more indirection for what are sometimes
very thin pass-throughs (`ticketController.getTicket` really is just three
lines) — a smaller CRUD-only app wouldn't need this many layers. Justified
here by the state machine/SLA/audit logic actually being complex enough to
want testing in isolation.

## 5. Category as a denormalized string on Ticket, not an ObjectId reference

**Alternatives considered**: `Ticket.category` as an ObjectId FK to
`Category`, populated on read (the "obviously correct" relational
instinct).

**Why the string**: `GET /dashboard/analytics`'s "tickets by category"
aggregation, and every category filter on the ticket list, group/match on
this field directly — with an ObjectId reference, every one of those
would need a `$lookup` (MongoDB's join) just to get back to a human-
readable name. Storing the name directly keeps the read-heavy, aggregation-
heavy paths simple and fast, at the cost of category renames not
retroactively updating old tickets — which, for a support-ticket history,
is arguably the *more* correct behavior anyway (a ticket should keep the
label it had at the time it was filed).

**Trade-off**: if categories needed to support renaming with full
historical consistency, this would need revisiting (e.g. storing both the
name and a reference, or a "category rename" migration step).

## 6. TypeScript 6.0 instead of TypeScript 7 (downgraded mid-build)

**Alternatives considered**: staying on TypeScript 7 (the newest release,
initially installed by default via `npm install typescript`) and forcing
past the ecosystem's peer-dependency warnings with `--force`.

**Why downgrade**: `typescript-eslint` doesn't just warn about TS7 — it has
a hard runtime check that refuses to run at all
(`typescript-eslint does not support TS 7.0`), which would have blocked
the CI pipeline's lint step entirely. Since TS7 is a same-generation
compiler reimplementation (not a language-syntax change), TS 6.0.3 gives
up nothing this project actually uses, in exchange for the whole tooling
ecosystem (ESLint, and implicitly anything else that shells out to `tsc`)
actually working.

**Trade-off**: none found in practice — this is the kind of decision that's
only interesting because of *when* it happened (discovered live, mid-build,
by an actual tool failure) rather than because the trade-off itself was
close.

## 7. Zod for validation, on both frontend and backend, independently

**Alternatives considered**: Joi (spec-listed alternative); validating only
on the backend and trusting the frontend's HTML5 `required`/`type`
attributes for UX.

**Why Zod**: TypeScript-first — a schema's inferred type (`z.infer<...>`)
IS the TypeScript type, so a validator and its corresponding type can never
silently drift apart the way a hand-written interface next to a
hand-written Joi schema could. Used on the backend as the real
authorization gate (`middleware/validate.ts`) and, separately, on the
frontend via React Hook Form's `zodResolver` for instant field-level
errors — genuinely two separate schema definitions (not shared code across
the frontend/backend boundary, since they run in different packages), kept
deliberately parallel rather than DRY, because the backend copy is the one
that actually matters for security and must not depend on frontend code
being present or correct.
