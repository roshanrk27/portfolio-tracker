## AI Coach – Perplexity Performance Plan

### Task 1 — Capture Configuration Needs
- **Goal:** Document the required Perplexity API key and endpoint so deployment is unblocked.
- **How to test:** Confirm `AI_COACH_API_DOCUMENTATION.md` includes a section describing `PERPLEXITY_API_KEY` and expected base URL.

### Task 2 — Define Perplexity Response Types
- **Goal:** Introduce TypeScript interfaces and Zod schema in `lib/ai-coach-api/types` describing the expected JSON payload from Perplexity.
- **How to test:** Run `tsc --noEmit` (or rely on Next build) to ensure the new types compile; intentionally feed an invalid object into the schema in a unit test or scratch script to verify it rejects.

### Task 3 — Add Perplexity HTTP Client Helper
- **Goal:** Create `lib/ai-coach-api/perplexity.ts` exporting a `fetchPerplexityPerformance` function that calls the API, enforces timeouts, and returns parsed JSON.
- **How to test:** Stub `fetch` (or use `globalThis.fetch = jest.fn` in a local script) to simulate success and failure responses, ensuring the helper handles 200/4xx/5xx paths correctly.

### Task 4 — Build Prompt Generator Utility
- **Goal:** Implement a pure helper (e.g., `buildFundPerformancePrompt`) that accepts goal context + fund list and returns the constrained prompt string.
- **How to test:** Verify in a simple unit script that the prompt contains every fund name/code passed in and enforces the JSON-only instruction.

### Task 5 — Gather Fund Context Helper
- **Goal:** Add a reusable function in `lib/ai-coach-api/helpers` (or similar) that formats mapped mutual funds (scheme name, AMFI code/ISIN, latest value) for the prompt.
- **How to test:** Call the helper with mocked goal + mapping data and ensure the output array is shaped for Task 4’s prompt generator.

### Task 6 — Implement `/goals/[goalId]/performance` Route
- **Goal:** Create `app/api/ai-coach/goals/[goalId]/performance/route.ts` that validates requests, loads goal + funds, calls the Perplexity client, validates the response, and returns the formatted payload.
- **How to test:** Hit the route locally (curl or Thunder Client) with a mocked Perplexity response (use dependency injection or environment toggle) and confirm success and error paths yield expected JSON.

### Task 7 — Wire Success/Failure Summaries
- **Goal:** Extend the response builder so every reply includes a neutral summary string, `data_source`, and `retrieved_at`, while surfacing Perplexity errors with a structured message.
- **How to test:** Trigger both a successful and a failed Perplexity call; inspect that the JSON fields are present or the error payload is well-formed.

### Task 8 — Update AI Coach Documentation
- **Goal:** Amend `AI_COACH_API_DOCUMENTATION.md` with the new endpoint contract, sample request/response, error modes, and rate-limit guidance.
- **How to test:** Review the rendered markdown to ensure the new section is accessible from the table of contents (if applicable) and cross-reference field names with Task 6’s implementation.

### Task 9 — Manual Verification Checklist
- **Goal:** Add a short checklist (e.g., in `fund_performance_tasks.md` or a new appendix section) describing how to manually verify the Perplexity-powered flow end-to-end.
- **How to test:** Follow the checklist on a staging environment to ensure it’s actionable; update if any step is ambiguous.

