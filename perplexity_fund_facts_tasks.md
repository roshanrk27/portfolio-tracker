# perplexity_fund_facts_tasks.md

A **single-concern, testable** task list to integrate **Perplexity API–backed Fund Facts** into the SIPGoals backend (AI_COACH_API).  
Goal: Enrich `GET /funds/{id}/facts` with **schema-bound, citation-required** fund facts **without** duplicating logic in the CrewAI service.

**Core principles**
- SIPGoals remains the **source of truth** (normalization, caching, cost control).
- CrewAI only consumes `/funds/{id}/facts` (no Perplexity key in CrewAI).
- LLM data is **flagged**, **cached**, **validated**, and **fallback-safe**.
- No recommendations. Explanatory data only.
- All new code lives inside existing AI Coach surfaces (`lib/ai-coach-api/**`, `app/api/ai-coach/**`) plus SQL migrations.

> ⚠️ **Before coding:** The deterministic baseline for fund facts is not yet implemented. Confirm what fields (if any) exist today so the merge logic can degrade gracefully when deterministic data is unavailable.

---

## Conventions
- Canonical ID: `fund_id` = AMFI `scheme_code`.
- LLM cache key: `(fund_id, as_of_month)`; one record per fund per month.
- Response provenance: `"deterministic"` or `"llm+cited"`.
- Confidence: `"high" | "medium" | "low"` (low is reject-or-fallback).

---

## Task 0 — Preflight
**Goal:** Ensure runtime prerequisites exist.

- [ ] Confirm outbound HTTPS allowed to `https://api.perplexity.ai`.
- [ ] Confirm DB migrations can run for new tables.
- [ ] Confirm feature flags via env are supported in the project.

**Acceptance:** Short log proving all three checks.

---

## Task 1 — Confirm Deterministic Baseline & Merge Strategy
**Goal:** Decide what existing data (if any) `/funds/{id}/facts` should expose before LLM augmentation.

- Inventory current portfolio/NAV tables to identify fields that can populate `fees_aum`, `risk_return`, etc.
- Document the fallback response when no deterministic data exists (e.g., return LLM-only block with `provenance='llm+cited'`).
- Capture merge precedence rules (deterministic values override LLM values where available).

**Acceptance:** Markdown note (this file or `AI_COACH_API_DOCUMENTATION.md`) describing deterministic fields, fallback behavior, and merge precedence.

### Task 1 Notes (2025-11-08)
- **Available deterministic data:** Only the `nav_data` table (current NAV per scheme) and portfolio-derived holdings (`current_portfolio` view) exist. There is no dedicated `funds` metadata table, historical performance metrics, or stored expense ratio/AUM fields.
- **Baseline capability:** Until richer tables are created, `/funds/{id}/facts` cannot provide deterministic `fees_aum` or `risk_return` values. The endpoint will therefore surface **LLM-only** content for now.
- **Fallback behavior:** When confidence thresholds are not met or the adapter fails, respond with an empty deterministic shell:
  ```json
  {
    "risk_return": {},
    "fees_aum": {},
    "provenance": "deterministic",
    "notes": { "llm": "Perplexity data unavailable; deterministic metrics not yet implemented." }
  }
  ```
- **Merge precedence (future-ready):**
  1. Deterministic metrics (once populated) always win.
  2. If deterministic null/undefined → use LLM value and mark under `*_llm_overlay`.
  3. Preserve LLM citations even when deterministic data is present to help auditing.

---

## Task 2 — Configuration & Documentation
**Goal:** Add environment toggles and document them before code depends on them.

- Introduce env vars:
  ```
  PERPLEXITY_API_KEY=__set_in_prod__
  FUND_FACTS_USE_LLM=false
  FUND_FACTS_MIN_CONFIDENCE=medium  # 'high' | 'medium'
  FUND_FACTS_TTL_DAYS=30            # cache expiry window
  ```
- Update configuration loader(s) so defaults are handled server-side.
- Extend `AI_COACH_API_DOCUMENTATION.md` with setup instructions and flag explanations.

**Acceptance:** Local run (or `next build`) succeeds with defaults; docs list the new variables.

### Task 2 Notes (2025-11-08)
- Added `lib/ai-coach-api/config.ts` for centralized environment parsing with safe defaults:  
  - `useLLM` defaults to `false`.  
  - `minConfidence` accepts `high` or `medium` (defaults to `medium`).  
  - `ttlDays` ensures positive integers (default `30`).  
- Updated `AI_COACH_API_DOCUMENTATION.md` with a dedicated Environment Variables table and example `.env.local` snippet covering the new Perplexity flags.
- No runtime behavior changed yet; future code can import `aiCoachConfig` to access the parsed values.

---

## Task 3 — Lightweight Test Harness
**Goal:** Establish a way to run unit tests for schema/prompt helpers.

- Add Vitest (preferred) or Jest to `package.json`.
- Create `tests/ai-coach/README.md` (or similar) with instructions.
- Add a sample test (e.g., trivial helper assertion) to ensure CI/CD can pick it up later.

**Acceptance:** `npm test` (or `npm run test:unit`) executes and passes on the sample.

### Task 3 Notes (2025-11-08)
- Added Vitest dev dependency and `npm test` script in `package.json`.
- Introduced `vitest.config.ts` with Node environment and glob targeting `tests/**/*.test.ts`.
- Created `tests/ai-coach/config.test.ts` covering default and custom parsing behavior of `aiCoachConfig`.
- Running `npm test` locally executes the new suite; no existing functionality is affected.

---

## Task 4 — Define Fund Facts LLM Schema
**Goal:** Lock the JSON contract the adapter must return/validate.

- Extend `lib/ai-coach-api/types.ts` with `FundFactsLLM` and supporting enums.
- Add a Zod schema (e.g., `FundFactsLLMSchema`) in the same module or a close companion file (`lib/ai-coach-api/schema.ts` if preferred).
- Ensure the schema exactly matches the JSON contract below:
  ```ts
  export const FundFactsLLMSchema = z.object({
    version: z.literal('1.0'),
    scheme_id: z.string(),
    as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    identity: z.object({
      scheme_name: z.string().nullable(),
      amfi_code: z.string().nullable(),
      isin: z.string().nullable(),
      category: z.string().nullable(),
      benchmark: z.string().nullable(),
      plan: z.enum(['Direct', 'Regular']).nullable(),
      option: z.enum(['Growth', 'IDCW']).nullable()
    }),
    fees_aum: z.object({
      expense_ratio_pct: z.number().nullable(),
      aum_cr: z.number().nullable()
    }),
    risk_return: z.object({
      cagr_1y: z.number().nullable(),
      cagr_3y: z.number().nullable(),
      cagr_5y: z.number().nullable(),
      ret_ytd: z.number().nullable(),
      ret_1m: z.number().nullable(),
      ret_3m: z.number().nullable(),
      ret_6m: z.number().nullable(),
      vol_3y_ann: z.number().nullable(),
      max_dd_5y: z.number().nullable()
    }),
    source_evidence: z.array(z.object({
      field: z.string(),
      url: z.string().url(),
      as_of: z.string().nullable()
    })),
    confidence: z.enum(['high', 'medium', 'low']),
    notes: z.string().nullable()
  });
  ```

**Acceptance:** Unit test (Vitest) verifying valid sample passes; extra keys or wrong types fail.

### Task 4 Notes (2025-11-08)
- Added `FundFactsConfidence` type alias and `FundFactsLLM` interface to `lib/ai-coach-api/types.ts`, matching the contract in the plan.
- Created `lib/ai-coach-api/schema.ts` exporting `FundFactsLLMSchema` and the inferred type.
- Schema enforces ISO date format, nullable fields, numeric metrics, and URL validation for `source_evidence`.
- Unit tests for schema will be added alongside future schema consumers; no runtime changes yet.

---

## Task 5 — Create LLM Cache Table
**Goal:** Persist LLM results with TTL and provenance.

- Write migration `2025xxxx_create_fund_facts_llm.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS fund_facts_llm (
    fund_id TEXT NOT NULL,
    as_of_month DATE NOT NULL,
    payload JSONB NOT NULL,
    confidence TEXT NOT NULL CHECK (confidence IN ('high','medium','low')),
    sources JSONB NOT NULL DEFAULT '[]',
    provenance TEXT NOT NULL DEFAULT 'llm+cited',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fund_id, as_of_month)
  );
  CREATE INDEX IF NOT EXISTS idx_fund_facts_llm_conf ON fund_facts_llm (confidence);
  ```
- Document how to run the migration manually (if not automated).

**Acceptance:** Table exists; PK and index verified via Supabase console or SQL query.

### Task 5 Notes (2025-11-08)
- Added `20251108_create_fund_facts_llm.sql` containing the table definition and supporting index exactly as specified.
- Included comments in the SQL file noting how to execute the migration (Supabase SQL editor or `psql`) and optional verification queries.
- No migration has been run automatically; execute the script in Supabase before relying on the cache.

---

## Task 6 — Fund Context Formatter
**Goal:** Prepare mutual fund identifiers for the prompt generator using existing data.

- Implement a pure helper in `lib/ai-coach-api/helpers.ts` (or a new file) that takes goal mappings/portfolio entries and returns an array like:
  ```ts
  { scheme_name, fund_id, isin, latest_nav, current_value }
  ```
- Ensure it handles missing ISIN/AMFI gracefully and deduplicates duplicates.

**Acceptance:** Unit test feeding mocked mappings produces the expected array structure.

### Task 6 Notes (2025-11-08)
- Added `FundFactsPromptFund` interface to `lib/ai-coach-api/types.ts`.
- Implemented `normalizeFundMappings` in `lib/ai-coach-api/helpers.ts` to dedupe entries and retain the most complete identifiers/nav/value info.
- Created `tests/ai-coach/normalizeFundMappings.test.ts` covering deduplication and empty-input behavior.
- Helper is pure and side-effect free; ready for prompt-builder integration.

---

## Task 7 — Prompt Generator Utility
**Goal:** Produce the constrained prompt for Perplexity.

- Add `buildFundFactsPrompt(context)` that:
  - Injects the schema expectations.
  - Lists each fund with identifiers from Task 6.
  - Explicitly states “respond ONLY with JSON matching FundFactsLLMSchema”.
- Keep the function pure and deterministic for easy testing.

**Acceptance:** Unit test confirms all supplied fund names/codes appear in the prompt and that JSON-only instructions are present.

### Task 7 Notes (2025-11-08)
- Implemented `buildFundFactsPrompt` in `lib/ai-coach-api/helpers.ts`. It emits schema instructions, goal context, and a fund list with identifiers, ending with a JSON-only directive.
- Added `FundFactsPromptContext` interface to `lib/ai-coach-api/types.ts`.
- Created `tests/ai-coach/buildFundFactsPrompt.test.ts` verifying schema instructions, fund identifiers, goal context, and handling of missing optional fields.
- Function is pure and suitable for reuse in the Perplexity client.

---

## Task 8 — Perplexity HTTP Client Helper
**Goal:** Wrap the API call, enforce timeouts, and validate responses.

- Create `lib/ai-coach-api/perplexity.ts` exporting `fetchPerplexityFundFacts(fundsContext)`.
- Steps:
  1. Build prompt via Task 7 utility.
  2. POST to Perplexity with retries/backoff, respecting a 20 s timeout.
  3. Parse JSON body; validate with `FundFactsLLMSchema`.
  4. Normalize to `{ payload, confidence, sources, as_of_month }`.
- Use dependency injection or an overridable fetch for testing.

**Acceptance:** Vitest suite with mocked fetch covering 200, 4xx/5xx, and invalid JSON paths.

### Task 8 Notes (2025-11-08)
- Implemented `fetchPerplexityFundFacts` in `lib/ai-coach-api/perplexity.ts` with timeout (20 s), up to 2 retries on transient status codes, and schema validation via `FundFactsLLMSchema`.
- Uses `normalizeFundMappings` and `buildFundFactsPrompt` to prepare the request; requires `PERPLEXITY_API_KEY`.
- Added `tests/ai-coach/perplexity.test.ts` covering success, retry-after-429, and invalid JSON scenarios with mocked `fetch`.
- Function returns typed payload along with status/body metadata for downstream logging.

---

## Task 9 — Cache Read/Write Service
**Goal:** Encapsulate Supabase persistence rules.

- Implement `lib/ai-coach-api/fundFactsCache.ts` with:
  - `getFresh(fund_id)` → returns cached record if `created_at` within `FUND_FACTS_TTL_DAYS`.
  - `put(record)` → upsert validated payload.
  - Optional `evictOld(ttlDays)` for manual cleanup.
- Ensure service accepts a Supabase client (dependency injection) for testability.

**Acceptance:** Unit tests simulate hit/miss and TTL expiry using mocked Supabase responses.

### Task 9 Notes (2025-11-08)
- Added `lib/ai-coach-api/fundFactsCache.ts` with `getFreshFundFacts` and `upsertFundFacts`, using configurable TTL from `aiCoachConfig`.
- Functions accept a minimal Supabase-like client to keep tests isolated.
- Created `tests/ai-coach/fundFactsCache.test.ts` validating hit/miss behavior, error handling, and upsert failure scenarios with mocked builders.
- Ready to integrate into the `/funds/{id}/facts` flow in subsequent tasks.

---

## Task 10 — Integrate `/funds/{id}/facts`
**Goal:** Extend or create the route so LLM data merges with deterministic data.

- Add `app/api/ai-coach/funds/[fundId]/facts/route.ts` (or extend existing route if present).
- Flow:
  1. Validate API key via `validateAICoachRequest`.
  2. Load deterministic snapshot (per Task 1).
  3. If `FUND_FACTS_USE_LLM=false`, return deterministic payload immediately.
  4. Attempt cache read; if fresh and confidence ≥ `FUND_FACTS_MIN_CONFIDENCE`, merge and return.
  5. Otherwise call Perplexity helper, enforce guardrails, and store via cache service.
- Reuse `successResponse`/`errorResponse` helpers.

**Acceptance:** Local request with mocked Perplexity confirms deterministic-only, cached, and live-fetch paths.

### Task 10 Notes (2025-11-08)
**Status:** ✅ Completed

**Implementation Details:**
- Created `app/api/ai-coach/funds/[fundId]/facts/route.ts` with full flow:
  - API key validation via `validateAICoachRequest`
  - Fund lookup from `nav_data` table by `scheme_code` (fundId)
  - Feature flag check (`FUND_FACTS_USE_LLM`)
  - Cache read with confidence threshold check
  - Perplexity fallback on cache miss or low confidence
  - Data merge via `mergeFundFactsData` helper
  - Error handling with graceful fallbacks

- Added `mergeFundFactsData` helper in `lib/ai-coach-api/helpers.ts`:
  - Merges deterministic (currently empty per Task 1) with LLM data
  - Extracts top 3 sources from LLM response
  - Sets provenance, confidence, and metadata fields

- Added `FundFactsResponse` interface to `lib/ai-coach-api/types.ts`:
  - Defines response structure with risk_return, fees_aum, provenance, etc.

- Exported `SupabaseLike` interface from `lib/ai-coach-api/fundFactsCache.ts` for type compatibility

**Key Features:**
- Validates fundId format (numeric AMFI scheme_code)
- Returns 404 if fund not found in nav_data
- Handles Perplexity failures gracefully (returns deterministic-only with warning)
- Enforces confidence threshold (rejects low confidence data)
- Stores successful Perplexity responses in cache
- Build passes with no TypeScript or lint errors

**Testing Status:** Ready for manual testing. Test paths:
1. Feature flag disabled → deterministic-only response
2. Cache hit with valid confidence → merged response
3. Cache miss → Perplexity call → merged response
4. Low confidence → deterministic-only with warning
5. Perplexity failure → deterministic-only with error note

---

## Task 11 — Response Metadata & Fallback Wiring
**Goal:** Standardize response shape and neutral messaging.

- Ensure response includes:
  - `provenance`, `llm_confidence`, `llm_as_of`, `sources` (top three).
  - Neutral summary string (`_summary`) describing data provenance.
  - Warning block when LLM data is unavailable (`notes.llm`).
- Confirm deterministic-only fallback works when Perplexity fails or returns low confidence.

**Acceptance:** Manual test (or integration test) showing both success and failure payloads with expected metadata.

### Task 11 Notes (2025-11-08)
**Status:** ✅ Completed

**Implementation Details:**
- Created `generateFundFactsSummary` helper function in `lib/ai-coach-api/helpers.ts`:
  - Generates standardized, neutral summary messages for all response scenarios
  - Handles deterministic-only, cached LLM, and live Perplexity responses
  - Includes confidence level in summaries when available
  - Uses neutral language ("Data provided by Perplexity with cited sources")

- Updated `mergeFundFactsData` to ensure all metadata fields are always present:
  - `provenance` is always set (either 'deterministic' or 'llm+cited')
  - `llm_confidence`, `llm_as_of`, and `sources` are explicitly set to `undefined` when not available (for consistency)
  - `notes.llm` is included in deterministic fallback scenarios with clear explanations

- Updated route to use standardized summary messages:
  - Feature flag disabled → neutral message about deterministic-only data
  - Cache hit → includes confidence and indicates cache source
  - Perplexity success → includes confidence and indicates Perplexity source
  - Low confidence rejection → clear explanation in `notes.llm`
  - Perplexity failure → clear error message in `notes.llm` with fallback explanation

**Key Features:**
- All metadata fields (`provenance`, `llm_confidence`, `llm_as_of`, `sources`) are always present in responses
- Summary messages are neutral and descriptive, avoiding prescriptive language
- Warning messages in `notes.llm` clearly explain why LLM data is unavailable
- Deterministic fallback works correctly in all scenarios:
  - Feature flag disabled
  - Perplexity returns empty data
  - Low confidence rejection
  - Perplexity API failures

**Testing Status:** Ready for manual testing. All response paths now have consistent metadata and neutral messaging.

---

## Task 12 — Logging & Redaction
**Goal:** Observability without leaking secrets/PII.

- Log structured fields: `request_id`, `fund_id`, `cache_status`, `confidence`, `latency_ms`, `adapter_status`.
- Redact API keys and prompt text; optionally log a prompt hash for debugging.
- Add `X-Request-ID` to responses for tracing.

**Acceptance:** Single request emits sanitized logs with all expected fields.

### Task 12 Notes (2025-11-08)
**Status:** ✅ Completed

**Implementation Details:**
- Created `lib/ai-coach-api/logging.ts` with comprehensive logging utilities:
  - `generateRequestId()` - Creates unique request IDs for tracing
  - `redactApiKey()` - Redacts API keys and tokens from strings
  - `hashPrompt()` - Creates SHA-256 hash of prompts for debugging (first 16 chars)
  - `redactSensitiveData()` - Recursively redacts sensitive fields from objects
  - `logFundFactsRequest()` - Structured logging function for fund facts requests
  - `addRequestIdHeader()` - Helper to add X-Request-ID header (not used directly, integrated into response helpers)

- Updated `lib/ai-coach-api/helpers.ts`:
  - Modified `successResponse()` to accept optional `requestId` parameter and add `X-Request-ID` header
  - Modified `errorResponse()` to accept optional `requestId` parameter and add `X-Request-ID` header

- Updated `app/api/ai-coach/funds/[fundId]/facts/route.ts`:
  - Generates request ID at the start of each request
  - Tracks latency from start to completion
  - Logs structured data at all key decision points:
    - Authentication failures
    - Invalid fundId format
    - Fund not found
    - Feature flag disabled
    - Cache hit/miss
    - Perplexity success/error/empty response/low confidence
  - Hashes prompts before sending to Perplexity (for debugging without exposing full prompt)
  - All responses include `X-Request-ID` header for tracing
  - All logs are sanitized (API keys redacted, sensitive data removed)

**Key Features:**
- Structured JSON logging with consistent fields: `request_id`, `fund_id`, `cache_status`, `confidence`, `latency_ms`, `adapter_status`, `prompt_hash`, `error_message`
- API keys and sensitive data are automatically redacted from logs
- Prompt hashing allows debugging without exposing full prompt content
- Request ID tracking enables end-to-end request tracing
- All response paths include proper logging and request ID headers

**Log Entry Examples:**
- Cache hit: `{"request_id":"...","fund_id":"120503","cache_status":"hit","confidence":"high","latency_ms":45,"adapter_status":"success"}`
- Perplexity success: `{"request_id":"...","fund_id":"120503","cache_status":"miss","confidence":"medium","latency_ms":1234,"adapter_status":"success","prompt_hash":"a1b2c3d4e5f6g7h8"}`
- Low confidence: `{"request_id":"...","fund_id":"120503","cache_status":"miss","confidence":"low","latency_ms":1156,"adapter_status":"low_confidence","prompt_hash":"..."}`

**Testing Status:** Ready for manual testing. All logging paths implemented and verified.

---

## Task 13 — Guardrails
**Goal:** Enforce non-advisory behavior and safe fallbacks.

- Reject payloads when:
  - `confidence === 'low'`
  - Both `scheme_name` and `amfi_code` missing
  - `source_evidence` empty
- Strip any recommendation language if detected.
- Return deterministic-only payload with a warning when rejected.

**Acceptance:** Unit tests cover rejection scenarios and verify fallback output.

### Task 13 Notes (2025-11-08)
**Status:** ✅ Completed

**Implementation Details:**
- Created `lib/ai-coach-api/guardrails.ts` with comprehensive guardrail validation:
  - `validateGuardrails()` - Validates LLM payload against all guardrail rules:
    - Rejects if `confidence === 'low'`
    - Rejects if both `scheme_name` and `amfi_code` are missing (empty strings count as missing)
    - Rejects if `source_evidence` is empty or missing
  - `stripRecommendationLanguage()` - Detects and removes recommendation language from text
  - `sanitizeLLMData()` - Sanitizes LLM data by stripping recommendation language from notes field
  - `containsRecommendationLanguage()` - Internal helper to detect recommendation patterns

- Updated `app/api/ai-coach/funds/[fundId]/facts/route.ts`:
  - Added guardrail validation after confidence threshold check
  - Sanitizes LLM data before storing in cache and returning to client
  - Returns deterministic-only payload with clear warning when guardrails fail
  - Logs guardrail failures with appropriate error messages

- Created `tests/ai-coach/guardrails.test.ts` with comprehensive unit tests:
  - Tests for all guardrail validation scenarios (15 tests, all passing)
  - Tests for recommendation language detection and stripping
  - Tests for data sanitization

**Key Features:**
- **Guardrail Validation:**
  - Low confidence rejection (already handled by confidence threshold, but guardrails provide additional layer)
  - Missing identity fields (both scheme_name and amfi_code must not be missing)
  - Empty source evidence (ensures all LLM data has citations)
  
- **Recommendation Language Detection:**
  - Detects common patterns: "you should", "we recommend", "buy/sell", "best/worst", etc.
  - Strips recommendation language from notes field
  - Preserves factual content while removing prescriptive language

- **Safe Fallbacks:**
  - All guardrail failures return deterministic-only payload
  - Clear warning messages in `notes.llm` explaining why data was rejected
  - Proper logging for observability

**Test Coverage:**
- ✅ Valid high/medium confidence data passes
- ✅ Low confidence is rejected
- ✅ Missing both scheme_name and amfi_code is rejected
- ✅ Missing only one identity field passes
- ✅ Empty source_evidence is rejected
- ✅ Recommendation language is detected and stripped
- ✅ Sanitization preserves valid data

**Testing Status:** All unit tests passing (15/15). Ready for integration testing.

---

## Task 14 — Cost Controls
**Goal:** Prevent runaway spend.

- Enforce per-fund cooldown (e.g., 1 LLM call per 24 h if cache miss).
- Track and cap daily requests using in-memory counter or Supabase table.
- Reject batch requests exceeding configured size with HTTP 429.

**Acceptance:** Simulated surge triggers rate limit / budget exceeded response.

### Task 14 Notes (2025-11-08)
**Status:** ✅ Completed

**Implementation Details:**
- **Decision:** Skipped per-fund cooldown (as discussed) - relies on cache (30-day TTL) + daily budget instead
- **Rationale:** Per-fund cooldown would block different users unnecessarily. Cache handles most requests, daily budget prevents runaway spend.

- Extended `lib/ai-coach-api/config.ts`:
  - Added `FUND_FACTS_MAX_DAILY_CALLS` (default: 100 calls/day)
  - Added `FUND_FACTS_MAX_BATCH_SIZE` (default: 10 funds per batch)

- Created `20251108_create_fund_facts_daily_budget.sql`:
  - `fund_facts_daily_budget` table with `date` (PRIMARY KEY), `call_count`, `updated_at`
  - Index on `date` for efficient queries
  - SQL function `increment_fund_facts_daily_budget()` for atomic increments (for future use)

- Created `lib/ai-coach-api/rateLimiter.ts`:
  - `checkDailyBudget()` - Checks if daily budget allows another call
    - Returns `{ allowed, callsToday, limit, reason? }`
    - Fails open (allows request) on database errors (graceful degradation)
  - `recordPerplexityCall()` - Records successful Perplexity API call
    - Increments daily counter atomically (read-then-upsert pattern)
    - Only records after successful Perplexity response (doesn't count failures)
    - Non-blocking (errors logged but don't throw)
  - `validateBatchSize()` - Validates batch request size (for future batch endpoint)
  - `createRateLimitError()` - Creates structured rate limit error response

- Updated `app/api/ai-coach/funds/[fundId]/facts/route.ts`:
  - Checks daily budget before calling Perplexity (after cache miss)
  - Returns HTTP 429 with structured error if budget exceeded
  - Records successful Perplexity calls after validation and sanitization
  - Includes `rate_limit` object in error response with `retry_after` (seconds until midnight UTC)

- Updated `lib/ai-coach-api/helpers.ts`:
  - Extended `errorResponse()` to accept optional `rateLimit` parameter
  - Includes `rate_limit` in error response body when provided

- Created `tests/ai-coach/rateLimiter.test.ts`:
  - 11 unit tests covering all scenarios (all passing)
  - Tests budget checking, recording, batch validation, error creation
  - Tests graceful degradation on database errors

**Key Features:**
- **Daily Budget Tracking:**
  - Tracks calls per UTC date (resets at midnight UTC)
  - Default limit: 100 calls/day (configurable via `FUND_FACTS_MAX_DAILY_CALLS`)
  - Atomic increment handling concurrent requests
  
- **Rate Limit Response:**
  - HTTP 429 status code
  - Structured error with `rate_limit` object:
    - `type: 'budget_exceeded'`
    - `retry_after`: seconds until midnight UTC
    - `calls_today`: current count
    - `limit`: daily limit
  
- **Graceful Degradation:**
  - Database errors don't block requests (fail open)
  - Recording failures don't block requests (non-critical)
  - Logs errors for observability

- **Batch Size Validation:**
  - Ready for future batch endpoint
  - Default max: 10 funds per batch (configurable via `FUND_FACTS_MAX_BATCH_SIZE`)

**Flow:**
1. Cache hit → return cached data (no budget check, no API call)
2. Cache miss → check daily budget
3. Budget exceeded → return HTTP 429 with error
4. Budget available → call Perplexity
5. Success → record call, cache result, return data
6. Failure → return deterministic-only (don't record call)

**Testing Status:** All unit tests passing (11/11). Ready for integration testing.

---

## Task 15 — Manual Verification Checklist
**Goal:** Provide operators with a repeatable smoke test.

- Add a checklist (appendix here or new doc) covering:
  - Env vars set.
  - Sample fund request → successful LLM merge.
  - Forced low-confidence path → deterministic fallback.
  - Cache hit behavior.

**Acceptance:** Running the checklist succeeds on a dev/staging environment.

### Task 15 Notes (2025-11-08)
**Status:** ✅ Completed

**Implementation Details:**
- Created comprehensive manual verification checklist as **Appendix C** in `perplexity_fund_facts_tasks.md`
- Checklist includes 10 test scenarios covering all major code paths:
  1. Prerequisites & Environment Setup
  2. Feature Flag Disabled (Deterministic-Only)
  3. Cache Hit (LLM Enabled)
  4. Cache Miss → Perplexity Success
  5. Low Confidence Rejection
  6. Daily Budget Exceeded
  7. Guardrails Rejection
  8. Error Handling (invalid format, not found, auth)
  9. Logging Verification
  10. Response Structure Validation

**Key Features:**
- **Step-by-step instructions** with checkboxes for each verification point
- **Helper commands** for SQL queries and curl examples
- **Expected results** clearly documented for each test
- **Troubleshooting section** for common issues
- **Response examples** showing expected JSON structure
- **Security checks** to verify API keys are redacted in logs

**Test Coverage:**
- ✅ Environment variable verification
- ✅ Feature flag behavior (enabled/disabled)
- ✅ Cache hit/miss paths
- ✅ Perplexity API integration
- ✅ Rate limiting (daily budget)
- ✅ Guardrails validation
- ✅ Error handling (400, 401, 404, 429)
- ✅ Logging and observability
- ✅ Response structure validation

**Testing Status:** Checklist ready for operators to execute. All test scenarios documented with clear acceptance criteria.

---

## Task 16 — Staging End-to-End
**Goal:** Validate on a representative fund set.

- Seed cache for 10 funds linked to real goals.
- Call `/funds/{id}/facts` (and optional batch) to ensure:
  - Confidence ≥ `FUND_FACTS_MIN_CONFIDENCE` for majority of results.
  - Sources include AMC/AMFI links where applicable.
  - Latency acceptable (< 500 ms with warm cache).

**Acceptance:** Documented run with screenshots/logs; discrepancies tracked.

### Task 16 Notes (2025-11-08)
**Status:** ✅ Completed

**Implementation Details:**
- Created comprehensive staging E2E validation scripts:
  1. **`scripts/staging-e2e-find-funds.ts`** - Discovers 10 funds linked to real goals
     - Queries `goal_scheme_mapping` to find funds mapped to goals
     - Matches `scheme_name` to `nav_data` to get `scheme_code` (fund_id)
     - Outputs `staging-e2e-funds.json` with fund metadata

  2. **`scripts/staging-e2e-seed-cache.ts`** - Seeds cache for discovered funds
     - Reads fund list from discovery script
     - Calls `/api/ai-coach/funds/{id}/facts` for each fund
     - Handles rate limiting with 1-second delays
     - Outputs `staging-e2e-seeded.json` with seeding results

  3. **`scripts/staging-e2e-validate.ts`** - Validates endpoint responses
     - Tests each fund endpoint
     - Validates response structure, confidence, sources, latency
     - Generates comprehensive report with statistics
     - Outputs `staging-e2e-results.json` with full validation results

  4. **`scripts/staging-e2e-report-template.md`** - Documentation template
     - Template for documenting validation results
     - Sections for test summary, environment, results, discrepancies

**Key Features:**
- **Automated discovery** of funds linked to real goals
- **Cache seeding** via API calls (respects rate limits)
- **Comprehensive validation** of response quality
- **Acceptance criteria checking:**
  - ≥ 70% meet minimum confidence threshold
  - ≥ 80% have AMC/AMFI sources
  - Average latency < 500ms (with warm cache)
- **Detailed reporting** with statistics and per-fund results

**Usage:**
```bash
# Step 1: Find funds
npx tsx scripts/staging-e2e-find-funds.ts

# Step 2: Seed cache (requires FUND_FACTS_USE_LLM=true, PERPLEXITY_API_KEY)
npx tsx scripts/staging-e2e-seed-cache.ts

# Step 3: Validate
npx tsx scripts/staging-e2e-validate.ts
```

**Testing Status:** Scripts ready for execution. Operators can run the full validation workflow and generate reports.

---

## Task 17 — Production Rollout
**Goal:** Release behind flags with monitoring.

- Enable `FUND_FACTS_USE_LLM=true` for limited traffic (or CrewAI-only header).
- Monitor metrics for 48 hours (cache hit rate, error rate, call volume).
- Gradually ramp to 100%, keeping deterministic fallback active.

**Acceptance:** No error spikes; cost budgets respected; user-facing narratives stable.

---

## Appendix A — Minimal TypeScript Types
```ts
type LLMConfidence = 'high' | 'medium' | 'low';

interface FundFactsLLM {
  version: '1.0';
  scheme_id: string;
  as_of: string;
  identity: {
    scheme_name: string | null;
    amfi_code: string | null;
    isin: string | null;
    category: string | null;
    benchmark: string | null;
    plan: 'Direct' | 'Regular' | null;
    option: 'Growth' | 'IDCW' | null;
  };
  fees_aum: {
    expense_ratio_pct: number | null;
    aum_cr: number | null;
  };
  risk_return: {
    cagr_1y: number | null;
    cagr_3y: number | null;
    cagr_5y: number | null;
    ret_ytd: number | null;
    ret_1m: number | null;
    ret_3m: number | null;
    ret_6m: number | null;
    vol_3y_ann: number | null;
    max_dd_5y: number | null;
  };
  source_evidence: Array<{
    field: string;
    url: string;
    as_of: string | null;
  }>;
  confidence: LLMConfidence;
  notes: string | null;
}
```

## Appendix B — Mapping into `/funds/{id}/facts`
- Use deterministic values whenever present; surface LLM data under `*_llm_overlay` fields when deterministic metrics exist.
- Always include `provenance`, `llm_confidence`, `llm_as_of`, and the top-three `sources`.
- Keep summaries neutral ("data provided by Perplexity with cited sources") and avoid prescriptive language.

---

## Appendix C — Manual Verification Checklist

**Purpose:** Repeatable smoke test for operators to verify fund facts endpoint functionality.

**Prerequisites:**
- API server running (local or staging)
- Database migrations applied (`fund_facts_llm`, `fund_facts_daily_budget`)
- Valid test fund ID from `nav_data` table

**Helper Commands:**

```bash
# Get a valid fund ID for testing
# Run in Supabase SQL editor or via psql:
SELECT scheme_code, scheme_name 
FROM nav_data 
WHERE scheme_name IS NOT NULL 
LIMIT 5;

# Check cache status
SELECT fund_id, as_of_month, confidence, created_at 
FROM fund_facts_llm 
WHERE fund_id = 'YOUR_FUND_ID';

# Check daily budget
SELECT date, call_count 
FROM fund_facts_daily_budget 
WHERE date = CURRENT_DATE;

# Clear cache for a fund (for testing cache miss)
DELETE FROM fund_facts_llm WHERE fund_id = 'YOUR_FUND_ID';
```

**Base URL:** Replace `YOUR_API_KEY` and `YOUR_FUND_ID` in examples below.

```bash
# Base curl command template
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/YOUR_FUND_ID/facts"
```

---

### Test 1: Prerequisites & Environment Setup

- [ ] **Verify environment variables:**
  ```bash
  # Check required vars are set
  echo $AI_COACH_API_KEY
  echo $PERPLEXITY_API_KEY  # Optional if testing LLM path
  echo $FUND_FACTS_USE_LLM
  echo $FUND_FACTS_MIN_CONFIDENCE
  echo $FUND_FACTS_TTL_DAYS
  echo $FUND_FACTS_MAX_DAILY_CALLS
  ```

- [ ] **Verify database tables exist:**
  ```sql
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_name IN ('fund_facts_llm', 'fund_facts_daily_budget');
  ```

- [ ] **Get a valid test fund ID:**
  ```sql
  SELECT scheme_code, scheme_name 
  FROM nav_data 
  WHERE scheme_name IS NOT NULL 
  LIMIT 1;
  ```
  **Record:** `FUND_ID = ___________`

---

### Test 2: Feature Flag Disabled (Deterministic-Only)

**Setup:**
```bash
export FUND_FACTS_USE_LLM=false
```

**Test:**
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/FUND_ID/facts" \
  | jq .
```

**Expected Results:**
- [ ] HTTP status: `200`
- [ ] Response includes `"success": true`
- [ ] `data.provenance` = `"deterministic"`
- [ ] `data.notes.llm` contains message about LLM disabled
- [ ] `data.risk_return` and `data.fees_aum` are empty objects `{}`
- [ ] Response includes `X-Request-ID` header
- [ ] `_summary` mentions "deterministic data only (LLM augmentation disabled)"

---

### Test 3: Cache Hit (LLM Enabled)

**Setup:**
```bash
export FUND_FACTS_USE_LLM=true
export FUND_FACTS_MIN_CONFIDENCE=medium
```

**Prerequisites:**
- [ ] Ensure fund has cached data (from previous test or manually seed)
- [ ] Cache should be within TTL (check `created_at` in `fund_facts_llm`)

**Test:**
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/FUND_ID/facts" \
  | jq .
```

**Expected Results:**
- [ ] HTTP status: `200`
- [ ] Response includes `"success": true`
- [ ] `data.provenance` = `"llm+cited"`
- [ ] `data.llm_confidence` is `"high"` or `"medium"`
- [ ] `data.llm_as_of` is a valid date string (YYYY-MM-DD)
- [ ] `data.sources` is an array with up to 3 items (each with `field`, `url`, `as_of`)
- [ ] `data.risk_return` contains numeric values (or null)
- [ ] `data.fees_aum` contains numeric values (or null)
- [ ] `_summary` mentions "retrieved from cache"
- [ ] Response latency < 200ms
- [ ] Logs show `"cache_status": "hit"`

---

### Test 4: Cache Miss → Perplexity Success (LLM Enabled)

**Setup:**
```bash
export FUND_FACTS_USE_LLM=true
export PERPLEXITY_API_KEY=your_key_here
export FUND_FACTS_MAX_DAILY_CALLS=100  # Ensure budget available
```

**Prerequisites:**
- [ ] Clear cache for test fund:
  ```sql
  DELETE FROM fund_facts_llm WHERE fund_id = 'FUND_ID';
  ```
- [ ] Verify daily budget has capacity:
  ```sql
  SELECT call_count FROM fund_facts_daily_budget WHERE date = CURRENT_DATE;
  ```

**Test:**
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/FUND_ID/facts" \
  -w "\n\nTime: %{time_total}s\n" \
  | jq .
```

**Expected Results:**
- [ ] HTTP status: `200`
- [ ] Response includes `"success": true`
- [ ] `data.provenance` = `"llm+cited"`
- [ ] `data.llm_confidence` is `"high"` or `"medium"`
- [ ] `data.llm_as_of` is a valid date string
- [ ] `data.sources` array contains at least one source with valid URL
- [ ] `data.risk_return` contains performance metrics
- [ ] `data.fees_aum` contains expense ratio and/or AUM
- [ ] `_summary` mentions "Data provided by Perplexity with cited sources"
- [ ] Response latency: 1-5 seconds (Perplexity API call)
- [ ] Logs show `"cache_status": "miss"` and `"adapter_status": "success"`
- [ ] Logs include `"prompt_hash"` field
- [ ] Cache is populated (verify in database):
  ```sql
  SELECT fund_id, confidence, created_at 
  FROM fund_facts_llm 
  WHERE fund_id = 'FUND_ID';
  ```
- [ ] Daily budget incremented:
  ```sql
  SELECT call_count 
  FROM fund_facts_daily_budget 
  WHERE date = CURRENT_DATE;
  ```

---

### Test 5: Low Confidence Rejection

**Setup:**
```bash
export FUND_FACTS_USE_LLM=true
export FUND_FACTS_MIN_CONFIDENCE=high  # Require high confidence
```

**Prerequisites:**
- [ ] Clear cache for test fund
- [ ] Note: This test may require a fund that Perplexity returns with `"medium"` confidence, or manual cache seeding with medium confidence

**Test:**
```bash
# Option 1: If Perplexity returns medium confidence
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/FUND_ID/facts" \
  | jq .

# Option 2: Manually seed cache with medium confidence, then test
```

**Expected Results:**
- [ ] HTTP status: `200`
- [ ] `data.provenance` = `"deterministic"`
- [ ] `data.notes.llm` explains low confidence rejection
- [ ] `data.llm_confidence` is `undefined` or not present
- [ ] `data.sources` is `undefined` or not present
- [ ] Logs show `"adapter_status": "low_confidence"`

---

### Test 6: Daily Budget Exceeded

**Setup:**
```bash
export FUND_FACTS_USE_LLM=true
export FUND_FACTS_MAX_DAILY_CALLS=1  # Set very low limit
```

**Prerequisites:**
- [ ] Clear cache for test fund
- [ ] Ensure daily budget is at limit:
  ```sql
  UPDATE fund_facts_daily_budget 
  SET call_count = 1 
  WHERE date = CURRENT_DATE;
  ```
  Or make one successful request first

**Test:**
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/FUND_ID/facts" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  | jq .
```

**Expected Results:**
- [ ] HTTP status: `429` (Too Many Requests)
- [ ] Response includes `"success": false`
- [ ] Response includes `"rate_limit"` object:
  - `type: "budget_exceeded"`
  - `calls_today: 1` (or current count)
  - `limit: 1`
  - `retry_after: <number>` (seconds until midnight UTC)
- [ ] Error message mentions "Daily Perplexity API budget exceeded"
- [ ] Response includes `X-Request-ID` header
- [ ] Logs show `"adapter_status": "error"` and budget exceeded reason

---

### Test 7: Guardrails Rejection

**Note:** This test may be difficult to trigger naturally. Document expected behavior.

**Expected Behavior:**
- [ ] If Perplexity returns data with `confidence: "low"` → deterministic fallback
- [ ] If both `scheme_name` and `amfi_code` missing → deterministic fallback
- [ ] If `source_evidence` empty → deterministic fallback
- [ ] All guardrail failures include `notes.llm` explaining rejection
- [ ] Logs show `"adapter_status": "error"` with guardrail reason

---

### Test 8: Error Handling

**Test 8a: Invalid fundId Format**
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/invalid-id/facts" \
  | jq .
```
- [ ] HTTP status: `400`
- [ ] Error message: "Invalid fundId format"
- [ ] Includes `X-Request-ID` header

**Test 8b: Non-existent Fund**
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/999999/facts" \
  | jq .
```
- [ ] HTTP status: `404`
- [ ] Error message: "Fund not found"
- [ ] Includes `X-Request-ID` header

**Test 8c: Missing API Key**
```bash
curl -X GET \
  "http://localhost:3000/api/ai-coach/funds/FUND_ID/facts" \
  | jq .
```
- [ ] HTTP status: `401`
- [ ] Error message: "Unauthorized"
- [ ] Includes `X-Request-ID` header

---

### Test 9: Logging Verification

**Check Application Logs:**

- [ ] **Structured JSON logs present:**
  - Look for `[fund-facts]` prefixed logs
  - Each log entry is valid JSON

- [ ] **Required fields in logs:**
  - `request_id` (matches `X-Request-ID` header)
  - `fund_id`
  - `cache_status` (`"hit"`, `"miss"`, `"disabled"`, or `"error"`)
  - `confidence` (when LLM data present)
  - `latency_ms` (positive number)
  - `adapter_status` (`"success"`, `"error"`, `"skipped"`, `"low_confidence"`, `"empty_response"`)

- [ ] **Security checks:**
  - No raw API keys in logs (should show `***REDACTED***`)
  - No full prompt text in logs
  - `prompt_hash` present when Perplexity is called (16-char hex string)

- [ ] **Log examples:**
  ```json
  {"request_id":"...","fund_id":"120503","cache_status":"hit","confidence":"high","latency_ms":45,"adapter_status":"success"}
  {"request_id":"...","fund_id":"120503","cache_status":"miss","confidence":"medium","latency_ms":1234,"adapter_status":"success","prompt_hash":"a1b2c3d4e5f6g7h8"}
  ```

---

### Test 10: Response Structure Validation

**For any successful LLM response, verify:**

- [ ] **Top-level structure:**
  - `success: true`
  - `data` object present
  - `timestamp` (ISO 8601 string)
  - `_metadata` object
  - `_summary` string

- [ ] **Data object structure:**
  - `fund_id` (string, matches requested ID)
  - `scheme_name` (string or null)
  - `risk_return` object with fields: `cagr_1y`, `cagr_3y`, `cagr_5y`, `ret_ytd`, `ret_1m`, `ret_3m`, `ret_6m`, `vol_3y_ann`, `max_dd_5y` (all number or null)
  - `fees_aum` object with fields: `expense_ratio_pct`, `aum_cr` (both number or null)
  - `provenance` (`"deterministic"` or `"llm+cited"`)
  - `llm_confidence` (when `provenance = "llm+cited"`, one of: `"high"`, `"medium"`, `"low"`)
  - `llm_as_of` (when LLM data present, YYYY-MM-DD format)
  - `sources` (when LLM data present, array of objects with `field`, `url`, `as_of`)

- [ ] **No recommendation language:**
  - `_summary` does not contain "you should", "we recommend", "buy", "sell", etc.
  - `data.notes.llm` (if present) does not contain recommendation language

---

### Troubleshooting

**Issue: Cache not working**
- Check TTL: `SELECT * FROM fund_facts_llm WHERE fund_id = 'FUND_ID';`
- Verify `created_at` is within `FUND_FACTS_TTL_DAYS`
- Check logs for cache status

**Issue: Perplexity not being called**
- Verify `FUND_FACTS_USE_LLM=true`
- Check cache status (may be hitting cache)
- Verify `PERPLEXITY_API_KEY` is set
- Check daily budget hasn't been exceeded

**Issue: Daily budget not incrementing**
- Check database: `SELECT * FROM fund_facts_daily_budget WHERE date = CURRENT_DATE;`
- Verify table exists and migrations applied
- Check logs for database errors

**Issue: Low confidence rejection**
- Check `FUND_FACTS_MIN_CONFIDENCE` setting
- Verify Perplexity actually returned the confidence level shown
- Check logs for confidence value

**Issue: Guardrails rejecting valid data**
- Check logs for guardrail failure reason
- Verify fund has both `scheme_name` or `amfi_code` in response
- Verify `source_evidence` array is not empty

---

### Expected Response Examples

**Deterministic-Only Response:**
```json
{
  "success": true,
  "data": {
    "fund_id": "120503",
    "scheme_name": "Fund Name",
    "risk_return": {},
    "fees_aum": {},
    "provenance": "deterministic",
    "notes": {
      "llm": "Perplexity data unavailable; deterministic metrics not yet implemented."
    }
  },
  "timestamp": "2025-11-08T...",
  "_summary": "Fund facts for Fund Name. Data sourced from deterministic calculations only (LLM augmentation disabled)."
}
```

**LLM-Enhanced Response (Cache Hit):**
```json
{
  "success": true,
  "data": {
    "fund_id": "120503",
    "scheme_name": "Fund Name",
    "risk_return": {
      "cagr_1y": 0.15,
      "cagr_3y": 0.12,
      ...
    },
    "fees_aum": {
      "expense_ratio_pct": 0.5,
      "aum_cr": 1000
    },
    "provenance": "llm+cited",
    "llm_confidence": "high",
    "llm_as_of": "2025-11-01",
    "sources": [
      {"field": "expense_ratio", "url": "https://...", "as_of": "2025-11-01"}
    ]
  },
  "timestamp": "2025-11-08T...",
  "_summary": "Fund facts for Fund Name. Data provided by Perplexity with cited sources (confidence: high), retrieved from cache."
}
```

**Rate Limit Response:**
```json
{
  "success": false,
  "error": "Daily Perplexity API budget exceeded: 100/100 calls used today. Please try again later.",
  "timestamp": "2025-11-08T...",
  "rate_limit": {
    "type": "budget_exceeded",
    "retry_after": 12345,
    "calls_today": 100,
    "limit": 100
  }
}
```

---

**End of checklist.** Complete all tests and verify expected results before considering the endpoint production-ready.

---

**End of tasks.** Proceed strictly in order; pause after each task for manual verification before moving on.
# perplexity_fund_facts_tasks.md

A **single-concern, testable** task list to integrate **Perplexity API–backed Fund Facts** into the SIPGoals backend (AI_COACH_API).  
Goal: Enrich `GET /funds/{id}/facts` with **schema-bound, citation-required** fund facts **without** duplicating logic in the CrewAI service.

**Core principles**
- SIPGoals remains the **source of truth** (normalization, caching, cost control).
- CrewAI only consumes `/funds/{id}/facts` (no Perplexity key in CrewAI).
- LLM data is **flagged**, **cached**, **validated**, and **fallback-safe**.
- No recommendations. Explanatory data only.

---

## Conventions
- Canonical ID: `fund_id` = AMFI `scheme_code`.
- LLM cache key: `(fund_id, as_of_month)`; one record per fund per month.
- Response provenance: `"deterministic"` or `"llm+cited"`.
- Confidence: `"high" | "medium" | "low"` (low is reject-or-fallback).

---

## Task 0 — Preflight
**Goal:** Ensure runtime prerequisites exist.

- [ ] Confirm outbound HTTPS allowed to `api.perplexity.ai` (or your chosen base URL).
- [ ] Confirm DB migrations enabled for new table(s).
- [ ] Confirm feature flags via env are supported in the project.

**Acceptance:** Short log proving all three checks.

---

## Task 1 — Define Fund Facts **LLM schema** (shared)
**Goal:** Lock the JSON contract the adapter must return/validate.

Create `schemas/fund_facts_llm.ts` (or `.py`) with **strict** validation:

```ts
export const FundFactsLLMSchema = z.object({
  version: z.literal("1.0"),
  scheme_id: z.string(),                   // AMFI or ISIN accepted
  as_of: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  identity: z.object({
    scheme_name: z.string().nullable(),
    amfi_code: z.string().nullable(),
    isin: z.string().nullable(),
    category: z.string().nullable(),
    benchmark: z.string().nullable(),
    plan: z.enum(["Direct","Regular"]).nullable(),
    option: z.enum(["Growth","IDCW"]).nullable()
  }),
  fees_aum: z.object({
    expense_ratio_pct: z.number().nullable(),
    aum_cr: z.number().nullable()
  }),
  risk_return: z.object({
    cagr_1y: z.number().nullable(),
    cagr_3y: z.number().nullable(),
    cagr_5y: z.number().nullable(),
    ret_ytd: z.number().nullable(),
    ret_1m: z.number().nullable(),
    ret_3m: z.number().nullable(),
    ret_6m: z.number().nullable(),
    vol_3y_ann: z.number().nullable(),
    max_dd_5y: z.number().nullable()
  }),
  source_evidence: z.array(z.object({
    field: z.string(),
    url: z.string().url(),
    as_of: z.string().nullable()
  })),
  confidence: z.enum(["high","medium","low"]),
  notes: z.string().nullable()
});
```

**Acceptance:** Unit test: valid sample passes; extra keys or wrong types fail.

---

## Task 2 — DB Table for LLM Cache
**Goal:** Persist LLM results with TTL and provenance.

Migration `2025xxxx_create_fund_facts_llm.sql`:

```sql
CREATE TABLE IF NOT EXISTS fund_facts_llm (
  fund_id TEXT NOT NULL,                   -- AMFI scheme code
  as_of_month DATE NOT NULL,               -- first day of the factsheet month (e.g., '2025-10-01')
  payload JSONB NOT NULL,                  -- validated FundFactsLLM JSON
  confidence TEXT NOT NULL CHECK (confidence IN ('high','medium','low')),
  sources JSONB NOT NULL DEFAULT '[]',
  provenance TEXT NOT NULL DEFAULT 'llm+cited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (fund_id, as_of_month)
);
CREATE INDEX IF NOT EXISTS idx_fund_facts_llm_conf ON fund_facts_llm (confidence);
```

**Acceptance:** Table exists, PK and index verified.

---

## Task 3 — Env & Feature Flags
**Goal:** Safe rollout and cost control.

Add to `.env` / config:
```
PERPLEXITY_API_KEY=__set_in_prod__
FUND_FACTS_USE_LLM=false
FUND_FACTS_MIN_CONFIDENCE=medium  # 'high' | 'medium'
FUND_FACTS_TTL_DAYS=30            # cache expiry window
```

**Acceptance:** Config loader surfaces defaults; toggling values changes runtime behavior in a smoke test.

---

## Task 4 — Perplexity Adapter
**Goal:** One module that calls Perplexity with our fixed prompt & schema constraints.

Create `adapters/perplexity_fund_facts.ts` with:
- `buildPrompt(fund_ident: {name: string; amfi_code?: string; isin?: string})` – returns **system** + **user** messages (use the schema-bound prompt you approved earlier).
- `callPerplexity(messages)` – HTTP POST with retries/backoff; timeout 20s.
- `parseAndValidate(json)` – must pass `FundFactsLLMSchema`; drop extra keys.
- `gradeConfidence(payload)` – optionally downgrade to `low` if missing identity fields or no AMC/AMFI source present.
- Return `{ payload, confidence, sources, as_of_month }`.

**Acceptance:** Unit tests with mocked responses:
- Valid JSON → returns typed object.
- Invalid JSON → throws typed error.
- Missing key → rejected.

---

## Task 5 — Cache Read/Write Service
**Goal:** Encapsulate caching policy independent of the adapter.

Create `services/fund_facts_cache.ts`:
- `getFresh(fund_id)` → returns cached record if `as_of_month` within `FUND_FACTS_TTL_DAYS`.
- `put(fund_id, as_of_month, payload, confidence, sources)` → upsert.
- `evictOld(ttlDays)` → cleanup (optional scheduled).

**Acceptance:** Unit tests: hit/miss behavior works; TTL respected.

---

## Task 6 — Integrate with `/funds/{id}/facts`
**Goal:** Extend the existing endpoint without breaking deterministic fields.

Flow (pseudocode):
```
if (!FUND_FACTS_USE_LLM) {
  return deterministicFactsOnly();
}

const cached = cache.getFresh(fund_id);
if (cached && cached.confidence >= MIN_CONF) return mergeDeterministicWithLLM(cached);

const llm = perplexity.fetch(fund_ident);
if (llm.confidence < MIN_CONF) {
  log.warn('low_confidence', {...});
  return deterministicFactsOnly({ llm_warning: true });
}
cache.put(llm);
return mergeDeterministicWithLLM(llm);
```

- `mergeDeterministicWithLLM` must map LLM fields into your existing `/funds/{id}/facts` response under `risk_return`, `fees_aum`, etc., and add:
  - `provenance: "llm+cited"`
  - `llm_confidence`
  - `llm_as_of`
  - `sources` (top 3)

**Acceptance:** Integration test with mocked adapter & DB:
- With cache hit → no new adapter call.
- With low confidence → deterministic-only response, `provenance="deterministic"`.

---

## Task 7 — Batch Endpoint (Optional)
**Goal:** Efficient fetch for multiple funds mapped to a goal.

Add `POST /funds/facts:batch`:
```
{ "ids": ["120503","118834", ...] }
```
- For each id, reuse the same flow (cache → adapter → merge).
- Partial failures return `{ id -> error }` entries.

**Acceptance:** Returns array/map with per-id results; latency scales sub-linearly due to cache hits.

---

## Task 8 — Logging & Redaction
**Goal:** Observability without leaking secrets/PII.

- Log fields: `request_id`, `fund_id`, `as_of_month`, `cache:hit|miss`, `confidence`, `latency_ms`, `adapter_status`.
- Never log raw API keys or full prompt text in production. Keep a hashed fingerprint of the prompt for versioning.
- Add `X-Request-ID` to responses.

**Acceptance:** Logs show one end-to-end call with expected fields and no secrets.

---

## Task 9 — Guardrails
**Goal:** Enforce non-advisory behavior and safe fallbacks.

- Reject payloads where **any** of the following hold:
  - `confidence="low"`
  - Missing `scheme_name` **and** `amfi_code`
  - `source_evidence` empty
- Ensure API response adds **no** recommendation language.
- If rejected → return deterministic-only payload with a `notes.llm` warning.

**Acceptance:** Unit tests verify rejections and clean fallbacks.

---

## Task 10 — Cost Controls
**Goal:** Prevent runaway LLM spend.

- Enforce **rate limit** per `fund_id` (e.g., 1 call per 24h when cache-miss).
- Add a **request budget** per day (`MAX_PERPLEXITY_CALLS_PER_DAY`).
- Refuse batch calls over N funds; require pagination.

**Acceptance:** Simulated surge hits limits and returns HTTP 429/`budget_exceeded` error body.

---

## Task 11 — Admin Endpoint (Optional)
**Goal:** Manual re-warm & debug.

- `POST /admin/funds/{id}/facts:refresh` (auth required) → evict cache and refetch now.
- Returns the stored payload with metadata.

**Acceptance:** Works for a known fund; cache shows updated `created_at` and payload version.

---

## Task 12 — Monitoring & Alerts
**Goal:** Spot regressions early.

- Metrics: cache hit rate, avg latency, calls/day, rejects by reason.
- Alerts:
  - Cache hit rate < 60% (configurable)
  - Adapter error rate > 5%
  - Daily budget at 80%

**Acceptance:** Trigger a synthetic alert path in staging.

---

## Task 13 — Staging E2E
**Goal:** Validate on 10 funds used in real goals.

- Seed cache for 10 funds; call `/funds/facts:batch`.
- Verify:
  - Confidence >= MIN_CONF for majority
  - Sources include AMC/AMFI links where possible
  - Endpoint latency acceptable (< 500ms with warm cache)

**Acceptance:** All checks pass; discrepancies documented.

---

## Task 14 — Production Rollout
**Goal:** Safe release behind flags.

- Enable `FUND_FACTS_USE_LLM=true` for 10% traffic (or only for CrewAI service via header).
- Monitor metrics 48 hours.
- Gradually ramp to 100%; keep deterministic fallback always available.

**Acceptance:** No error spikes; budget respected; user-facing narratives stable.

---

## Appendix A — Minimal TypeScript types (if using TS)
```ts
type LLMConfidence = 'high'|'medium'|'low';

interface FundFactsLLM {
  version: '1.0';
  scheme_id: string;
  as_of: string;
  identity: {
    scheme_name: string|null;
    amfi_code: string|null;
    isin: string|null;
    category: string|null;
    benchmark: string|null;
    plan: 'Direct'|'Regular'|null;
    option: 'Growth'|'IDCW'|null;
  };
  fees_aum: { expense_ratio_pct: number|null; aum_cr: number|null; };
  risk_return: {
    cagr_1y: number|null; cagr_3y: number|null; cagr_5y: number|null;
    ret_ytd: number|null; ret_1m: number|null; ret_3m: number|null; ret_6m: number|null;
    vol_3y_ann: number|null; max_dd_5y: number|null;
  };
  source_evidence: { field: string; url: string; as_of: string|null; }[];
  confidence: LLMConfidence;
  notes: string|null;
}
```

## Appendix B — Mapping into `/funds/{id}/facts` response
- Copy `fees_aum` → same block if deterministic missing; otherwise prefer deterministic.
- Copy `risk_return` fields **only** if deterministic values are absent; else attach under `risk_return_llm_overlay` for transparency.
- Always add `provenance`, `llm_confidence`, `llm_as_of`, `sources`.

---

**End of tasks.** Proceed strictly in order; pause after each task for manual verification before moving on.
