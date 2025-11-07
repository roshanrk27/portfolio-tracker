# 🧠 sipgoals AI Coach — v1 Build Plan (Granular, Task-by-Task)

> Strategy: ship a **tiny but end‑to‑end slice** with real persistence and streaming, then expand capability.  
> Rules for each task: **small, testable, one concern, clear start/end**, explicit acceptance criteria and test steps.

---

## Phase 0 — Project plumbing (safe scaffolding)

### 0.1 Create Python runtime skeleton (no logic yet)
**Start:** New files  
**End:** Python FastAPI app loads with `/healthz` OK
- Files:
  - `api/aicoach/session.py` (temporary 200 OK JSON stub)
  - `api/aicoach/stream.py` (temporary SSE stub that emits a ping then closes)
  - `aicoach/app/main.py` (FastAPI factory + include routers)
  - `requirements.txt` (`fastapi`, `uvicorn`, `pydantic`, `httpx`)
  - `runtime.txt` (`3.11`)
- Accept:
  - `vercel dev` shows `GET /api/aicoach/healthz` → `{"ok": true}`
- Test:
  - `curl -s http://localhost:3000/api/aicoach/healthz | jq .ok` → `true`

### 0.2 Add Node façade routes (no external calls)
**Start:** Next.js API stubs  
**End:** Node routes respond locally
- Files:
  - `app/api/ai/coach/start/route.ts` (returns fake `{sessionId, streamUrl}`)
  - `app/api/ai/coach/stream/route.ts` (proxies to Python stream URL env or returns stub SSE)
- Accept:
  - `POST /app/api/ai/coach/start` → 200 with `sessionId`
  - `GET /app/api/ai/coach/stream?sessionId=...` → text/event-stream
- Test:
  - Browser EventSource connects; receives one `init` event and closes.

### 0.3 vercel.json + env plumbed
**Start:** No cron/runtime set  
**End:** Python runtime declared; dummy cron hits Node webhook
- Files:
  - `vercel.json`:
    ```json
    {
      "functions": { "api/aicoach/*.py": { "runtime": "python3.11" } },
      "crons": [{ "path": "/app/api/ai/coach/webhook?job=daily", "schedule": "0 2 * * *" }]
    }
    ```
- Accept:
  - `vercel build` succeeds
- Test:
  - `curl -I http://localhost:3000/app/api/ai/coach/webhook?job=daily` → 200

---

## Phase 1 — Persistence (Supabase) with strict RLS

### 1.1 Create AI tables migration
**Start:** No AI tables  
**End:** `ai_sessions`, `ai_events`, `ai_insights`, `ai_recommendations`, `ai_topic_ledger`, `ai_user_prefs` created
- Files:
  - `supabase/migrations/2025_10_18_ai_coach_core.sql` (as per architecture)
- Accept:
  - Migration applies cleanly locally/remote
- Test:
  - `supabase db push` then `select count(*) from ai_sessions;` works

### 1.2 Add RLS policies
**Start:** No policies  
**End:** RLS on all AI tables enforced
- Files:
  - Update same migration with `ENABLE ROW LEVEL SECURITY` and policies
- Accept:
  - Anonymous client cannot read others’ rows; service role can write
- Test:
  - From `supabase-js` with anon key, read/write only for own `auth.uid()`

### 1.3 DB adapter in Python
**Start:** No DB access in Python  
**End:** `aicoach/adapters/supabase.py` exposes typed CRUD for AI tables
- Accept:
  - `create_session(user_id, trigger)` returns UUID; `get_session(id)` returns row
- Test:
  - Add `pytest` test `tests/test_supabase_adapter.py` with a test table/row fixture

---

## Phase 2 — Auth bridge (Node → Python)

### 2.1 Node-side JWT signer
**Start:** No signed tokens  
**End:** `lib/auth.ts` can sign 10‑min RS256 JWTs
- Files:
  - `AICOACH_JWT_PRIVATE_KEY` (env)
  - `lib/auth.ts` (`jose` SignJWT)
- Accept:
  - Unit test verifies token structure/exp
- Test:
  - `node -e "require('./lib/test-sign').run()"` prints a valid JWT

### 2.2 Python-side verifier
**Start:** No verification  
**End:** `aicoach/app/deps.py` verifies RS256; exposes `current_user`
- Files:
  - `AICOACH_JWT_PUBLIC_KEY` or JWKS URL (env)
- Accept:
  - Invalid/expired token → 401
- Test:
  - `curl -H "Authorization: Bearer bad" .../session` → 401

### 2.3 Wire façade to Python
**Start:** Stub calls  
**End:** `start/route.ts` calls `POST /api/aicoach/session` with Bearer JWT
- Accept:
  - `sessionId` returned from Python; façade just forwards
- Test:
  - `curl -XPOST /app/api/ai/coach/start` → `{sessionId, streamUrl}`

---

## Phase 3 — Minimal end‑to‑end run (fake compute)

### 3.1 Python: create session + emit SSE heartbeat
**Start:** Stubs  
**End:** On start, insert `ai_sessions(running)` and SSE emits `{type:"status",msg:"started"}`
- Files:
  - `api/aicoach/session.py`: create row; return `{sessionId, streamUrl}`
  - `api/aicoach/stream.py`: poll KV for events; emit heartbeat then close
- Accept:
  - Row exists; SSE connects and receives a `started` event
- Test:
  - `select status from ai_sessions where id=...` → `running`

### 3.2 Node proxy SSE to browser
**Start:** Stub stream  
**End:** `/app/api/ai/coach/stream` pipes aicoach SSE to client
- Accept:
  - Browser `EventSource` receives `started`
- Test:
  - Open console; see events arriving

### 3.3 KV wiring for transient events
**Start:** No KV  
**End:** `aicoach/memory/kv_store.py` with `emit_event(session_id, payload)` and `next_events`
- Accept:
  - Can push/pop JSON events; TTL set (e.g., 15m)
- Test:
  - `pytest tests/test_kv_store.py` passes

---

## Phase 4 — Deterministic math & data access (no LLM yet)

### 4.1 Portfolio reader tool (readonly)
**Start:** None  
**End:** `tools/portfolio_reader.py` reads typed views (`current_portfolio`, `goals`, mappings)
- Accept:
  - For a known test user, returns holdings/goals
- Test:
  - `pytest tests/test_portfolio_reader.py` with fixtures

### 4.2 Goal math (XIRR/CAGR/step-up)
**Start:** None  
**End:** `tools/goal_math.py` pure functions + unit tests
- Accept:
  - Edge cases: zero flows, irregular cashflows, single point
- Test:
  - `pytest tests/test_goal_math.py` green

### 4.3 Fake “insight” generator (no LLM)
**Start:** None  
**End:** `agents/performance.py` produces a single deterministic insight JSON
- Accept:
  - Writes one `ai_insights` row with `data` payload
- Test:
  - `select * from ai_insights where session_id=...` exists

### 4.4 Stream insights as they land
**Start:** Heartbeat only  
**End:** Python watches DB/KV; on new insight → SSE `{"type":"insight",...}`
- Accept:
  - Browser shows an InsightCard upon event
- Test:
  - Manual run: see a card appear without refresh

---

## Phase 5 — v1 Coach flow (single-focus)

### 5.1 Orchestrator skeleton (one task graph)
**Start:** No orchestrator  
**End:** `core/orchestrator.py` runs a linear pipeline: read → compute → write → emit
- Accept:
  - Returns success; uses KV checkpoints to resume
- Test:
  - Kill mid-run; restart → continues or safe-retries

### 5.2 Planner for “performance-only”
**Start:** None  
**End:** `core/planner.py` returns one task: `run_performance_agent`
- Accept:
  - Request with `focus:["performance"]` launches the one task
- Test:
  - Session summary shows `task_count=1`

### 5.3 UI Coach Hub v1 (read-only feed)
**Start:** Empty page  
**End:** `page.tsx` lists last 10 insights for current user
- Accept:
  - Server-side fetch via `supabase-js` (RLS) works
- Test:
  - Log in as test user; see insights list

### 5.4 SSE console (live tokens)
**Start:** None  
**End:** `CoachSessionConsole.tsx` subscribes; prints `status/insight` events
- Accept:
  - Clicking “Run Coach” shows live messages
- Test:
  - Trigger → see `started` then `insight`

---

## Phase 6 — LLM integration (guarded)

### 6.1 OpenAI tool wrapper with schema
**Start:** None  
**End:** `tools/openai_tool.py` enforces JSON schema via `pydantic` and retries on parse failure
- Accept:
  - Max tokens, temperature, model env-configurable
- Test:
  - Unit test: malformed LLM output is retried or rejected

### 6.2 Replace fake insight with LLM summary (bounded)
**Start:** Deterministic only  
**End:** `agents/performance.py` uses `openai_tool` to generate markdown `body_md` from computed `data`
- Accept:
  - If LLM fails, still write a deterministic fallback
- Test:
  - Force failure via mock → fallback path exercised

### 6.3 Guardrails (PII scrub & budgets)
**Start:** None  
**End:** `core/guardrails.py` redacts PII, enforces per‑session token budget
- Accept:
  - Redaction removes folio/email
- Test:
  - Input containing PII → prompt shown in logs has placeholders

---

## Phase 7 — Allocation & basic recommendation (optional, tiny)

### 7.1 Allocation drift calculator
**Start:** None  
**End:** `agents/allocation.py` computes drift vs target; writes an `ai_insights` row
- Accept:
  - Drift fields: by asset class, by scheme category
- Test:
  - Unit test with known fixtures produces expected drift

### 7.2 Minimal “action hint” (non-binding)
**Start:** None  
**End:** `agents/recommendation.py` proposes a non-committal hint (e.g., “reduce equity by 5%”)
- Accept:
  - Writes `ai_recommendations` status=`proposed`
- Test:
  - Row exists; surfaces in UI as a “Hint” pill

---

## Phase 8 — Feedback & ledger (no repeat)

### 8.1 Feedback endpoint (Node → Python → DB)
**Start:** Stubs  
**End:** UI thumbs up/down posts to `/app/api/ai/coach/feedback` → Python → store feedback (events table)
- Accept:
  - Row in `ai_events(kind='feedback')`
- Test:
  - Click UI button → row created

### 8.2 Topic ledger de‑dup
**Start:** None  
**End:** `memory/ledger.py` with `record(topic_key)` and `seen_recently(topic_key)`
- Accept:
  - Re-runs within N days skip duplicate advice
- Test:
  - Two consecutive runs produce one ledger entry and only first writes

---

## Phase 9 — Scheduled runs & emails (optional for v1)

### 9.1 Daily cron → selective recompute
**Start:** Cron stub  
**End:** `/api/aicoach/webhook?job=daily` scans ledger to decide if a new run is warranted
- Accept:
  - When nothing changed, exits fast
- Test:
  - Log shows “skipped” and zero DB writes

### 9.2 Weekly email digest (placeholder)
**Start:** None  
**End:** Compose plain-text digest (no send) and store to `ai_events(kind='email_preview')`
- Accept:
  - Row exists with body size < 100KB
- Test:
  - Manual fetch and read in console

---

## Phase 10 — Observability & hardening

### 10.1 Telemetry correlation (sessionId)
**Start:** No tracing  
**End:** Node adds `x-session-id` header; Python logs and DB events include it
- Accept:
  - Can trace a user run across logs and DB rows
- Test:
  - Grep sessionId in logs shows full path

### 10.2 Error envelopes & retries
**Start:** Ad hoc errors  
**End:** Orchestrator wraps each task with bounded retries + classification
- Accept:
  - Tool 429 → backoff retry; JSON parse → one retry then fallback
- Test:
  - Inject faults in tests; verify paths

### 10.3 Load smoke (100 parallel short runs)
**Start:** No load check  
**End:** Script fires 100 `POST /start` with tiny budgets; all complete < serverless limits
- Accept:
  - 95th percentile latency < target; zero cold start errors
- Test:
  - Save results to CSV; inspect p95

---

## Phase 11 — Deployment & runbook

### 11.1 Vercel preview deploy with secrets
**Start:** Local only  
**End:** Preview URL works end-to-end with real DB (staging)
- Accept:
  - Click “Run Coach” → live insight appears
- Test:
  - QA checklist completed by clicking through UI

### 11.2 Runbook (README excerpt)
**Start:** None  
**End:** `aicoach/README.md` covering: restart, rotate keys, raise budgets, disable Perplexity
- Accept:
  - New engineer can handle routine ops
- Test:
  - Peer review confirms clarity

---

## Scope Gate for v1 “Done”
- Start/stream works (SSE with at least one real insight)
- Performance agent computes deterministic metrics and LLM summary with fallback
- Insights stored + rendered in UI
- RLS enforced; no PII in prompts
- Basic observability + error handling in place

---

## Quick Task Index (IDs → for your engineering LLM)

0.1 Python skeleton
0.2 Node façade stubs
0.3 vercel.json + cron
1.1 AI tables migration
1.2 RLS policies
1.3 Python DB adapter
2.1 Node JWT signer
2.2 Python JWT verifier
2.3 Wire façade → Python
3.1 Create session + heartbeat
3.2 SSE proxy in Node
3.3 KV transient events
4.1 Portfolio reader
4.2 Goal math
4.3 Fake insight writer
4.4 Stream DB→SSE
5.1 Orchestrator skeleton
5.2 Planner (performance-only)
5.3 UI Coach Hub v1
5.4 SSE console
6.1 OpenAI wrapper + schema
6.2 LLM summary w/ fallback
6.3 Guardrails (PII, budgets)
7.1 Allocation drift
7.2 Action hint (proposed)
8.1 Feedback endpoint
8.2 Topic ledger de-dup
9.1 Daily cron selective
9.2 Weekly digest preview
10.1 Telemetry correlation
10.2 Error envelopes + retries
10.3 Load smoke (100 runs)
11.1 Preview deploy
11.2 Runbook

---

### Notes
- Keep each PR under ~200 lines; land fast, test after each task.
- Prefer **pure functions** with unit tests for math; integration tests only at boundaries.
- Start with **LLM disabled**; enable after deterministic metrics are solid.
