# Architecture

## System architecture

```mermaid
flowchart LR
    Browser["Browser<br/>React + TanStack Query"]
    LB["nginx<br/>(static files, Docker only)"]
    API["Express API<br/>/api/v1/*"]
    WS["Socket.IO<br/>(same HTTP server)"]
    Mongo[("MongoDB<br/>Atlas or local")]
    Disk[("Local disk<br/>ticket attachments")]
    Jaeger[("Jaeger<br/>(Docker only)")]
    Prom["/metrics<br/>(Prometheus format)"]

    Browser -- "HTTPS (REST)" --> LB
    Browser -- "HTTPS (REST, direct in dev)" --> API
    Browser -- "WebSocket" --> WS
    LB -- "reverse proxy (prod)" --> API
    API -- Mongoose --> Mongo
    WS -- "same process" --> API
    API -- "read/write files" --> Disk
    API -- "traces, OTLP/HTTP" --> Jaeger
    API -- "exposes" --> Prom
```

In development, the frontend (Vite dev server, :5173) calls the backend
(:4000) directly. In the Docker/production setup, nginx serves the built
static frontend and the browser still calls the backend API directly
(cross-origin, handled by CORS) — nginx here is a static file server, not
an API gateway; there is no server-side proxying to hide the backend's
location for this build.

## Component diagram (backend)

```mermaid
flowchart TB
    subgraph HTTP[" "]
        Routes["routes/*<br/>(URL -> middleware chain)"]
        MW["middleware/*<br/>auth, validate, rateLimit, upload, errorHandler"]
    end
    Controllers["controllers/*<br/>(thin — parse request, call service, shape response)"]
    Services["services/*<br/>(business logic — state machine, SLA, audit, auth)"]
    Repos["repositories/*<br/>(only place that talks to Mongoose models)"]
    Models["models/*<br/>(Mongoose schemas)"]
    Sockets["sockets/*<br/>(Socket.IO auth + emit helpers)"]
    Obs["observability/*<br/>(Pino logger, request logging)"]

    Routes --> MW --> Controllers --> Services --> Repos --> Models
    Services -.emits via.-> Sockets
    HTTP -.wrapped by.-> Obs
```

**Why this layering?** Each layer has exactly one job, and only talks to
the layer directly below it:

- **Routes** wire a URL + HTTP method to a chain of middleware + one
  controller function. No logic here beyond that wiring.
- **Middleware** answers cross-cutting questions that apply to many routes:
  "is this request authenticated?" (`auth.ts`), "is the body/query/params
  shaped correctly?" (`validate.ts`), "has this IP made too many requests?"
  (`rateLimit.ts`).
- **Controllers** are deliberately thin: read `req`, call ONE service
  function, shape the HTTP response (status code, `{ success, data }`
  envelope). No business rules live here.
- **Services** hold all business logic — the ticket state machine, SLA
  calculation, audit logging, auth token issuance. This is the layer unit
  tests target directly, without needing HTTP or a database.
- **Repositories** are the ONLY code that imports a Mongoose model and
  calls `.find()`/`.create()`/etc. If MongoDB were ever swapped for another
  database, only this layer changes.

This mirrors the "Controller → Service → Repository → Database" flow the
brief describes; we didn't invent a new shape, just implemented that one.

## Data model

```mermaid
erDiagram
    USER ||--o{ TICKET : "creates (customer)"
    USER ||--o{ TICKET : "assigned to (agent)"
    USER ||--o{ COMMENT : writes
    USER ||--o{ REFRESH_TOKEN : owns
    TICKET ||--o{ COMMENT : has
    TICKET }o--|| CATEGORY : "belongs to (by name)"
    TICKET }o--|| SLA_POLICY : "priority looked up against"
    USER ||--o{ AUDIT_LOG : "acts as (nullable)"

    USER {
        ObjectId _id
        string name
        string email
        string passwordHash
        enum role "CUSTOMER | AGENT | ADMIN"
        boolean isActive
    }
    TICKET {
        ObjectId _id
        string ticketNumber
        string title
        string description
        string category
        enum priority "LOW | MEDIUM | HIGH | CRITICAL"
        enum status "OPEN..CLOSED, 7 values"
        string[] tags
        ObjectId customer FK
        ObjectId assignedAgent FK "nullable"
        TicketAttachment[] attachments "embedded"
        Date responseDeadline
        Date resolutionDeadline
        Date firstResponseAt "nullable"
        Date resolvedAt "nullable"
    }
    COMMENT {
        ObjectId _id
        ObjectId ticket FK
        ObjectId author FK
        enum authorRole
        string text
        boolean isInternal
    }
    CATEGORY {
        ObjectId _id
        string name
        boolean isActive
    }
    SLA_POLICY {
        ObjectId _id
        enum priority
        number responseMinutes
        number resolutionMinutes
    }
    AUDIT_LOG {
        ObjectId _id
        ObjectId actor FK "nullable = system"
        string action
        string entity
        ObjectId entityId
        mixed oldValue
        mixed newValue
        Date timestamp
    }
    REFRESH_TOKEN {
        ObjectId _id
        ObjectId user FK
        string tokenHash
        Date expiresAt
        boolean revoked
    }
```

### Embedded vs. referenced — and why

| Relationship | Choice | Why |
|---|---|---|
| Ticket → attachments | **Embedded** (array of subdocuments on the Ticket) | Attachments are always read/written together with their ticket, never queried independently, and there are at most a handful per ticket — no risk of hitting MongoDB's 16MB document size limit. Embedding avoids an extra query on every ticket-detail load. |
| Ticket → comments | **Referenced** (`Comment.ticket` FK) | A busy ticket could accumulate hundreds of comments over its lifetime — unbounded growth is exactly what embedding should avoid (a document that keeps growing forever risks that same 16MB ceiling, and forces loading the WHOLE comment history just to read the ticket's title). Comments are also independently paginated/filtered (internal vs. customer-visible), which is far more natural as its own collection. |
| Ticket → category | **Referenced by NAME (string), not ObjectId** | A deliberate denormalization. Analytics ("tickets by category") and filters group by this field constantly — storing the name directly avoids a `$lookup` join on every single read/aggregation. The cost: renaming a category doesn't retroactively relabel old tickets — for a support-ticket history, that's usually the CORRECT behavior anyway (a ticket keeps the label it had when it was filed). |
| Ticket → customer / assignedAgent | **Referenced** (ObjectId FK, populated on read) | Users are a genuinely separate entity with their own lifecycle (login, role changes, deactivation) — embedding a customer's data into every one of their tickets would duplicate it everywhere and go stale the moment they changed their name. |
| AuditLog → entity | **Referenced by ObjectId, generically** (`entity: "Ticket"`, `entityId: ObjectId`) | The audit log needed to point at users, tickets, categories, and SLA policies alike without four separate collections — a generic reference plus a type-tag string covers all of them with one schema. |

### Indexes (see `backend/src/models/Ticket.ts`)

| Index | Query pattern it serves |
|---|---|
| `{ status: 1 }` | Filtering the ticket list/queue by status alone |
| `{ assignedAgent: 1 }`, `{ customer: 1 }` | "My tickets" (customer) / "my queue" (agent) lookups |
| `{ assignedAgent: 1, status: 1, createdAt: -1 }` (compound) | The actual agent-queue query: filtered by agent AND status, sorted newest-first — one index satisfies filter AND sort together. Measured impact in [BUILD_LOG.md](BUILD_LOG.md#performance-pass). |
| `{ customer: 1, status: 1, createdAt: -1 }` (compound) | Same shape, customer-side ("My Tickets" filtered + sorted) |
| `{ priority: 1, status: 1 }` | Dashboard "critical tickets still open" style queries |
| `AuditLog: { entityId: 1 }`, `{ timestamp: 1 }` | "History for this ticket" / audit log browsing newest-first |
| `RefreshToken: { expiresAt: 1 }` (TTL index) | Automatic cleanup — MongoDB deletes expired refresh tokens itself |

### Potential scaling problems, honestly

- **`category` as a denormalized string** means renaming a category doesn't
  cascade to existing tickets (see table above) — a feature here, but worth
  knowing it's a deliberate trade-off if requirements ever change.
- **Regex search on `title`** (`ticketRepository.ts`) is fine at the scale
  tested (10k tickets — see [BUILD_LOG.md](BUILD_LOG.md#performance-pass))
  but doesn't scale to millions of documents or fuzzy/relevance-ranked
  search. A real search need would call for Atlas Search or a dedicated
  search engine (Elasticsearch/Meilisearch) — noted, not built.
- **Attachments on local disk** (`backend/uploads/`) don't survive a
  container being recreated unless the volume is preserved (docker-compose
  does mount a volume for this) and don't horizontally scale across
  multiple backend instances — a real multi-instance deployment would need
  S3-compatible object storage instead.
- **Socket.IO's in-memory room state** is per-process — running multiple
  backend instances behind a load balancer would need the Socket.IO Redis
  adapter so a socket connected to instance A still receives an event
  emitted from instance B. Not needed at this project's scale (single
  instance), flagged for anyone scaling it up.

## Request lifecycle

```mermaid
sequenceDiagram
    participant B as Browser
    participant MW as helmet/cors/cookies/json/rateLimit
    participant Log as pino-http
    participant Auth as requireAuth + requireRole
    participant Val as validate (Zod)
    participant Ctrl as Controller
    participant Svc as Service
    participant Repo as Repository
    participant DB as MongoDB

    B->>Log: HTTP request (wraps everything, times it)
    Log->>MW: 
    MW->>Auth: (protected routes only)
    Auth->>Auth: verify JWT, attach req.user
    Auth->>Val: 
    Val->>Val: parse+validate body/params/query, replace with parsed data
    Val->>Ctrl: 
    Ctrl->>Svc: call ONE service function
    Svc->>Svc: business rules (state machine, SLA, ownership checks)
    Svc->>Repo: 
    Repo->>DB: Mongoose query
    DB-->>Repo: documents
    Repo-->>Svc: 
    Svc-->>Ctrl: result (or throws AppError)
    Ctrl-->>B: { success, data } JSON
    Note over Log,B: on error: errorHandler catches it,<br/>logs full detail, returns { success:false, error, requestId }
```

## Observability

Two complementary layers, deliberately not the same thing:

- **Structured logs** (Pino, see [SECURITY.md](SECURITY.md) and
  `observability/logger.ts`/`requestLogger.ts`) answer "what happened, in
  words" — one JSON line per request, correlated to a client-visible
  `requestId`.
- **Traces + metrics** (OpenTelemetry, `observability/tracing.ts`/`otel.ts`)
  answer "where did the time go, across layers, for THIS one request" —
  something a log line's single duration number can't show.

```mermaid
flowchart LR
    HTTP["HTTP Request<br/>(auto-instrumented: http)"]
    Route["Express Route<br/>(auto-instrumented: express)"]
    Svc["Service<br/>(manual span: withSpan())"]
    DB["MongoDB<br/>(auto-instrumented: mongodb driver)"]

    HTTP --> Route --> Svc --> DB
```

**Why three different instrumentation strategies for one waterfall?** The
outer three (HTTP/Express/MongoDB) are all real libraries `require()`d by
the app — OpenTelemetry's Node auto-instrumentation patches them at
require-time (see `tracing.ts`'s own comment on why it MUST be the first
import in `index.ts`), so those spans appear with zero application code
written for them. The **Service** layer is different: it's plain
TypeScript function calls, nothing to monkey-patch — so it's invisible in
a trace unless something wraps it in a span on purpose. `observability/
otel.ts` exports a small `withSpan()` helper, used explicitly around
`ticketService.createTicket`, `ticketService.updateTicketStatus`, and
`dashboardService.getSummary`/`getAnalytics` — one concrete instance of the
exact chain the spec names, plus the exact route the spec names as the
thing to investigate for latency.

**Where traces go**: no collector required by default — with
`OTEL_EXPORTER_OTLP_ENDPOINT` unset, spans print straight to the console
(true "zero setup"). Set it (or just run `docker compose up`, which wires
it automatically to the bundled Jaeger service) and traces export over
OTLP/HTTP to a real trace UI at http://localhost:16686 instead — same code,
no rebuild, just a different env var.

**Metrics**: `@opentelemetry/exporter-prometheus` starts its own tiny HTTP
server (`OTEL_METRICS_PORT`, default `9464`) serving `/metrics` in
Prometheus's scrape format directly — no collector needed either; a real
Prometheus instance (or Grafana on top of one) can point at it as-is.

**Logs and traces are correlated automatically**, not just conceptually
adjacent: `getNodeAutoInstrumentations()` includes a Pino instrumentation
that injects the active span's `trace_id`/`span_id` into every structured
log line for free (verified directly — a real request's log line carries
both alongside the usual `req`/`res`/`responseTime` fields). In a real
Jaeger deployment this is what lets you go from "grep the logs for an
error" to "open the exact trace that produced it" in one step.

**What's NOT done**: a Grafana dashboard visualizing the Prometheus data —
the metrics endpoint exists and is scrape-ready, wiring an actual Grafana
service into `docker-compose.yml` was judged lower-value than the tracing
work itself for the time available.

## AI Assist

The spec's optional bonus feature: `POST /tickets/:id/ai-analyze`
(Agent/Admin only) generates a summary, a suggested category/priority, and a
draft first response for a ticket.

```mermaid
flowchart LR
    Ctrl["ticketController<br/>.analyzeWithAi"]
    Svc["ticketService<br/>.getAiAnalysis"]
    AI["aiService<br/>.analyzeTicket()<br/>— the ONE seam"]
    Graph["ticketAnalysisGraph<br/>(LangGraph + Groq)"]
    Mock["mockAnalyzer<br/>(keyword rules)"]

    Ctrl --> Svc --> AI
    AI -- "GROQ_API_KEY set" --> Graph
    AI -- "no key / disabled / graph threw" --> Mock
```

**The graph itself** (`ai/ticketAnalysisGraph.ts`) is a real fan-out/fan-in,
not one prompt call dressed up in LangGraph for its own sake:

```mermaid
flowchart LR
    START((START)) --> classify["classify<br/>(category + priority,<br/>structured output)"]
    START --> summarize["summarize<br/>(1-2 sentence summary)"]
    classify --> draft["draftResponse<br/>(needs BOTH outputs)"]
    summarize --> draft
    draft --> END((END))
```

`classify` and `summarize` only need the ticket's raw title/description, so
they run as independent parallel branches — LangGraph batches everything
reachable from `START` into one superstep. `draftResponse` genuinely can't
start until both finish (it references the classified category/priority AND
the summary when drafting a reply), so it's a real fan-in, not just two
sequential steps forced apart. `classify` uses `.withStructuredOutput(zodSchema)`
so its output is a typed `{ category, priority }`, not free text to parse —
and the returned category is validated against the ticket system's actual
active categories, falling back to the first valid one rather than trusting
an LLM not to hallucinate a category that doesn't exist.

**Replaceable service abstraction**: every caller (`ticketService`,
transitively the controller) only ever imports `aiService.analyzeTicket()`.
Nothing outside `aiService.ts` knows LangGraph or Groq exist — swapping the
provider means editing/replacing `ai/ticketAnalysisGraph.ts` and this one
call site, never the controller, route, or frontend contract. (A dynamic
`import()` was tried first, specifically to keep the LangGraph module out of
the mock-only path entirely — reverted after live verification caught it
silently failing under `tsx`'s dev-time module resolution; see
[BUILD_LOG.md](BUILD_LOG.md#ai-ticket-assistant-langgraph--groq) for what
that actually looked like. The module has no expensive side effects at
import time, so a static import costs nothing.)

**Mock fallback** (`ai/mockAnalyzer.ts`): deterministic keyword matching
(e.g. "500"/"down"/"outage" → `CRITICAL`), not a real classifier — good
enough to prove the feature's full shape (API contract, audit log, UI) with
zero network calls, which is also why it's what the automated test suite
exercises (no `GROQ_API_KEY` secret is configured in CI).

**Not persisted on the ticket**: like `sla` (see above), an analysis is
recomputed fresh each time an agent clicks "Analyze" — it's a suggestion for
whoever's looking at the ticket right now, not part of the ticket's
authoritative state. Every request is still recorded to the audit trail
(`AI_ANALYSIS_REQUESTED`, with the source — `groq` or `mock` — in its
metadata) so there's a record of when AI assistance was used.

## Authentication flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant API as Backend

    B->>API: POST /auth/login {email, password}
    API->>API: bcrypt.compare, sign 15-min JWT access token,<br/>generate random refresh token, store its HASH
    API-->>B: { accessToken } in body + refreshToken in httpOnly cookie
    Note over B: accessToken kept in memory only (never localStorage)

    B->>API: subsequent requests: Authorization: Bearer <accessToken>
    API-->>B: 200 (while access token is valid, ~15 min)

    B->>API: request after access token expires -> 401
    B->>API: POST /auth/refresh (cookie sent automatically by browser)
    API->>API: hash cookie value, look up in DB, verify not expired/revoked
    API->>API: REVOKE old refresh token, issue a NEW one (rotation)
    API-->>B: new { accessToken } + new refresh cookie
    Note over B: axios interceptor does this automatically and retries<br/>the original failed request once — invisible to the user

    B->>API: POST /auth/logout
    API->>API: revoke refresh token in DB, clear cookie
```

Full trade-off discussion (why access+refresh instead of one long-lived
token, why httpOnly cookie vs. localStorage) in
[DECISIONS.md](DECISIONS.md).
