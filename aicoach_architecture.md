# **🧠 sipgoals AI Coach — Option A (Same Project) Architecture**

**Decision**: Start with the **AI Coach inside the existing `sipgoals` Next.js project on Vercel**. This keeps ops simple, ships fast, and still preserves a clean boundary so you can extract it later if needed.

This doc gives the **file & folder structure**, **what each part does**, **where state lives**, and **how services connect**—tailored for a single Vercel project that contains both the web app and the coach.

---

## **0\) High‑level picture**

\[ Browser / Next.js UI \]  
        │  
        ▼  
\[ sipgoals (Next.js on Vercel) \]  
   ├─ app/api/ai/coach/\*        (Node.js API routes: thin façade \+ SSE proxy)  
   ├─ api/aicoach/\*.py          (Python Functions: CrewAI orchestrator & agents)  
   ├─ supabase/\*                (migrations for AI tables \+ RLS \+ pgvector)  
   └─ cron (vercel.json)        (daily/weekly hooks → Python handlers)  
        │  
        ├──────────────HTTP──────────────▶  api/aicoach/session.py (start run)  
        ├──────────────SSE ◀─────────────▶  api/aicoach/stream.py  (live tokens)  
        │  
        ▼  
\[ Supabase Postgres \+ pgvector \]  ◀──KV──▶  \[ Vercel KV / Upstash (ephemeral) \]

* **Next.js UI** renders the coach feed and streams tokens via SSE.

* **Node API routes** issue short‑lived JWTs, proxy SSE, and provide a stable surface for the UI.

* **Python Functions** (in the same repo) run **CrewAI** agents/tools and write durable artifacts to Supabase.

* **Supabase** stores canonical portfolio data **and** all AI artifacts (insights, recommendations, sessions, events, ledger).

* **Vercel KV (Redis)** provides short‑lived session state and idempotency.

Why this split? You get the ergonomics of Next.js on the UI and the flexibility of Python/CrewAI for agent logic—without a second repo or deployment.

---

## **1\) Folder structure (single repo)**

repo-root/  
├─ app/  
│  ├─ dashboard/  
│  │  └─ ai-coach/  
│  │     ├─ page.tsx                    \# Coach hub (feed \+ actions)  
│  │     └─ components/  
│  │        ├─ InsightCard.tsx  
│  │        ├─ RecommendationCard.tsx  
│  │        ├─ AllocationHealth.tsx  
│  │        ├─ GoalProgressCoach.tsx  
│  │        └─ CoachSessionConsole.tsx  \# Live run console (SSE)  
│  │  
│  └─ api/  
│     └─ ai/  
│        └─ coach/  
│           ├─ start/route.ts           \# POST: sign JWT; call Python /session; return sessionId+streamUrl  
│           ├─ stream/route.ts          \# GET: proxy SSE from Python /stream  
│           ├─ feedback/route.ts        \# POST: forward feedback to Python  
│           └─ webhook/route.ts         \# (optional) Vercel Cron entrypoint → Python webhook  
│  
├─ api/  
│  └─ aicoach/  
│     ├─ session.py                     \# POST /api/aicoach/session (FastAPI/Flask handler)  
│     ├─ stream.py                      \# GET  /api/aicoach/stream  (SSE tokens)  
│     ├─ insights.py                    \# GET  /api/aicoach/insights  
│     ├─ feedback.py                    \# POST /api/aicoach/feedback  
│     └─ webhook.py                     \# POST /api/aicoach/webhook?job=\*  
│  
├─ aicoach/  
│  ├─ app/  
│  │  ├─ main.py                        \# FastAPI app factory (reused by api handlers)  
│  │  ├─ deps.py                        \# auth (verify Node‑signed JWT), db, kv providers  
│  │  └─ config.py                      \# env, rate limits, timeouts, budgets  
│  │  
│  ├─ core/  
│  │  ├─ orchestrator.py                \# Crew graph build/run; retries; timeouts; cancellation  
│  │  ├─ planner.py                     \# intent → agent task graph  
│  │  ├─ state.py                       \# session state interface (KV+DB)  
│  │  ├─ events.py                      \# domain events (emit/store)  
│  │  └─ guardrails.py                  \# schema checks, PII scrub, tool allowlist  
│  │  
│  ├─ agents/  
│  │  ├─ goal\_insights.py  
│  │  ├─ performance.py  
│  │  ├─ allocation.py  
│  │  ├─ recommendation.py  
│  │  └─ qa\_citation.py  
│  │  
│  ├─ tools/  
│  │  ├─ portfolio\_reader.py            \# typed queries to Supabase views/tables  
│  │  ├─ goal\_math.py                   \# XIRR/CAGR/step‑up deterministic math  
│  │  ├─ nav\_prices.py                  \# AMFI/stocks cache access (read‑through cache)  
│  │  ├─ perplexity\_tool.py             \# guarded external research  
│  │  ├─ openai\_tool.py                 \# structured generations \+ JSON validation  
│  │  └─ schemas.py                     \# Pydantic contracts (Insight/Recommendation)  
│  │  
│  ├─ memory/  
│  │  ├─ kv\_store.py                    \# Upstash/Vercel KV client  
│  │  ├─ vector\_store.py                \# pgvector helpers  
│  │  └─ ledger.py                      \# topic de‑dup (no‑repeats)  
│  │  
│  ├─ adapters/  
│  │  ├─ supabase.py                    \# PostgREST/psycopg; RLS‑aware reads; service‑role writes  
│  │  ├─ sse.py                         \# server‑sent events helpers  
│  │  └─ telemetry.py                   \# Langfuse/Sentry  
│  │  
│  ├─ prompts/  
│  │  ├─ system/\*                       \# system prompts per agent  
│  │  ├─ task/\*                         \# task prompts per pipeline  
│  │  └─ eval/\*                         \# critique checklists  
│  │  
│  ├─ pipelines/  
│  │  ├─ on\_demand\_session.py           \# user‑triggered run  
│  │  ├─ on\_data\_change\_session.py      \# post‑ingest recompute  
│  │  └─ scheduled\_checkin\_session.py   \# daily/weekly  
│  │  
│  └─ tests/  
│     ├─ test\_agents.py  
│     ├─ test\_tools.py  
│     └─ test\_pipelines.py  
│  
├─ lib/  
│  ├─ supabase.ts                        \# supabase-js client (RLS)  
│  ├─ coachClient.ts                     \# TS client to call Node façade  
│  ├─ auth.ts                            \# sign short‑lived JWT for Python  
│  └─ sse.ts                             \# EventSource proxy utils  
│  
├─ supabase/  
│  ├─ migrations/  
│  │  ├─ 2025\_10\_18\_ai\_coach\_core.sql    \# ai\_sessions, ai\_events, ai\_insights, ai\_recommendations, ledger, prefs  
│  │  └─ 2025\_10\_18\_pgvector.sql         \# enable vector ext (if not yet)  
│  └─ functions/                         \# (optional) edge functions for ingestion hooks  
│  
├─ vercel.json                           \# function runtimes \+ crons  
├─ requirements.txt                      \# Python deps (crewai, fastapi, openai, httpx, pydantic)  
├─ runtime.txt                           \# python-3.11  
├─ package.json  
└─ env.example

### **What each part does (quick map)**

* **UI (`app/dashboard/ai-coach/*`)**: Insights & recos feed, allocation and goal widgets, live console.

* **Node façade (`app/api/ai/coach/*`)**: Auth, JWT signing, SSE proxy, stable UI contracts, rate limiting, telemetry.

* **Python Functions (`api/aicoach/*.py`)**: HTTP handlers that call into `aicoach/app/main.py` to run CrewAI.

* **Crew core (`aicoach/core/*`)**: Orchestrator & planner, state management, guardrails, eventing.

* **Agents & tools (`aicoach/agents/*`, `aicoach/tools/*`)**: Domain logic \+ deterministic math \+ data access.

* **Memory (`aicoach/memory/*`)**: Ephemeral KV, topic ledger, optional vector retrieval.

* **Adapters (`aicoach/adapters/*`)**: Supabase, SSE, telemetry integrations.

* **DB (`supabase/migrations/*`)**: Durable AI artifacts schema \+ RLS.

---

## **2\) API surface (internal stability for the UI)**

The UI only talks to **Node routes**; Node talks to **Python** with a short‑lived JWT.

POST /app/api/ai/coach/start    → calls   POST /api/aicoach/session  
GET  /app/api/ai/coach/stream   → proxies GET  /api/aicoach/stream  
POST /app/api/ai/coach/feedback → calls   POST /api/aicoach/feedback  
(app or Vercel Cron)            → calls   POST /api/aicoach/webhook?job=\*

**Auth flow**

1. Node verifies end‑user session.

2. Node signs a **5–10 min JWT** with claims `{ sub: userId, scope: ["coach:run"] }`.

3. Node calls Python with `Authorization: Bearer <token>`.

4. Python verifies JWT (embedded public key or JWKS endpoint) and maps `sub → auth.uid()` for RLS.

---

## **3\) Database (Supabase) — durable state & RLS**

* `ai_sessions(id, user_id, trigger, status, started_at, ended_at, summary)`

* `ai_events(id, session_id, user_id, phase, kind, payload, created_at)`

* `ai_insights(id, user_id, session_id, scope, title, body_md, data, created_at)`

* `ai_recommendations(id, user_id, session_id, kind, rationale_md, actions_json, status, created_at)`

* `ai_topic_ledger(id, user_id, topic_key, last_seen_at, metadata)`

* `ai_user_prefs(user_id, tone, risk_profile, notify_email, notify_push)`

* `ai_docs(id, user_id, kind, ref_id, content_md, embedding vector)` (optional pgvector store)

**RLS**: `USING (user_id = auth.uid())` on SELECT; `WITH CHECK (user_id = auth.uid())` on INSERT/UPDATE.

---

## **4\) Where state lives**

* **Short‑lived orchestration**: `Vercel KV / Upstash` via `aicoach/memory/kv_store.py` (graph cursor, tool cache, idempotency keys, small AMFI caches).

* **Durable artifacts**: Supabase tables (`ai_sessions`, `ai_events`, `ai_insights`, `ai_recommendations`).

* **Personalization**: `ai_user_prefs`.

* **No‑repeat memory**: `ai_topic_ledger`.

* **Searchable docs** (optional): `ai_docs` with `pgvector`.

---

## **5\) How services connect (end‑to‑end flows)**

### **A) On‑demand coaching (user clicks “Run Coach”)**

Browser → Node /app/api/ai/coach/start  
  1\) Node checks auth → signs JWT → calls Python /api/aicoach/session  
  2\) Python creates ai\_sessions(status='running'), primes KV state  
  3\) Browser opens /app/api/ai/coach/stream?sessionId=…  
     Node proxies to Python /api/aicoach/stream (SSE)  
  4\) Crew agents read portfolio/goals via Supabase (RLS reads or service‑role as needed)  
  5\) Agents write insights/recos to Supabase; Python emits SSE tokens per artifact  
  6\) UI updates feed/cards; session ends (status='succeeded'|'failed')

### **B) After data ingestion (CAMS / NAV / prices)**

Ingestion completes → Node hits Python /api/aicoach/webhook?job=post\_ingest  
  → Orchestrator recomputes affected goals/schemes only  
  → Writes insights/recos; optional notifications

### **C) Scheduled check‑ins**

* `vercel.json` cron triggers Node webhook which calls Python `/webhook?job=daily`.

* Python enqueues work in KV (ids) and processes in small batches to respect serverless limits.

---

## **6\) Guardrails, privacy, and cost controls**

* **PII scrub**: no folio numbers/emails in prompts; use stable numeric IDs.

* **Tool allow‑list**: Perplexity disabled by default; explicit opt‑in per agent.

* **Schema validation**: Pydantic (Python) & Zod (Node) at the boundaries; rejects unsafe output.

* **Budgets**: per‑session token caps; per‑user/day caps; global circuit breaker.

* **Auditability**: `ai_insights.data` contains the numbers/series used; link back to source rows.

---

## **7\) vercel.json & env**

**vercel.json**

{  
  "functions": {  
    "api/aicoach/\*.py": { "runtime": "python3.11" }  
  },  
  "crons": \[  
    { "path": "/app/api/ai/coach/webhook?job=daily", "schedule": "0 2 \* \* \*" },  
    { "path": "/app/api/ai/coach/webhook?job=weekly\_email", "schedule": "0 3 \* \* 1" }  
  \]  
}

**Environment variables**

* **Shared**: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_KEY` (server/Python), `KV_REST_API_URL`, `KV_REST_API_TOKEN`.

* **LLMs**: `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`.

* **Auth bridge**: `AICOACH_JWT_PRIVATE_KEY` (Node) and `AICOACH_JWT_PUBLIC_KEY` (Python) or a JWKS URL.

* **Telemetry**: `SENTRY_*`, `LANGFUSE_*` (optional).

---

## **8\) Testing & quality gates**

* **Unit tests**: deterministic math in `goal_math.py` with fixtures.

* **Golden tests**: snapshot JSON for `agents/*` given fixed portfolio fixtures.

* **Contract tests**: Node façade ↔ Python API; Zod/Pydantic round‑trip.

* **SSE soak**: 100 parallel sessions with token budgets; ensure Node proxy is stable.

* **Observability**: Langfuse traces per tool call; Sentry errors with `sessionId` correlation.

---

## **9\) Rollout plan**

1. Apply `supabase/migrations/2025_10_18_ai_coach_core.sql` (+ pgvector if using retrieval).

2. Implement Python handlers under `api/aicoach/*` calling `aicoach/app/main.py`.

3. Wire Node façade (`app/api/ai/coach/*`) for start/stream/feedback/webhook.

4. Build the Coach Hub UI and hook up SSE.

5. Enable daily cron (low volume), watch costs/latency, then scale.

---

## **10\) One‑glance “what lives where”**

* **Transient**: Vercel KV (session graph cursor, idempotency, small caches).

* **Durable**: Supabase (sessions, events, insights, recommendations, ledger, prefs, docs).

* **UI & façade**: Next.js pages \+ Node API routes.

* **Agents & orchestration**: Python Functions (CrewAI) in `api/aicoach/*` \+ `aicoach/*`.

* **External tools**: OpenAI, Perplexity (budgeted, allow‑listed).

---

**End of doc.**

