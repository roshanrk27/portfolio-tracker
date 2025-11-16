# fund_performance_tasks.md

A step-by-step, **single-concern and testable** plan to compute mutual fund performance from historical NAVs and expose it via your existing AI Coach API.  
Follow **one task at a time**. After each task, **wait for manual tests** before proceeding.

> **Context you provided:** You already have a `nav_data` table that stores the latest NAV per `scheme_code`. Use this to seed the one-time historical backfill from mfapi.in.

---

## Conventions

- **Canonical Fund ID**: `scheme_code` (AMFI code).  
- **Data Source**: [`mfapi.in`](https://www.mfapi.in/) for historical NAVs; `nav_data` for latest NAV presence and fund list.  
- **Time Windows** (v1):  
  - CAGR: 1Y, 3Y, 5Y  
  - Trailing (simple): YTD, 1M, 3M, 6M  
  - Volatility (annualized): last 3Y  
  - Max Drawdown: last 5Y (or all available if <5Y)  
- **Retention**: Keep **full historical NAVs**, compute **daily snapshots** (one per fund per `as_of`). Keep latest; optionally retain 30–90 days.  
- **Percentages** are decimals in DB (`0.132` = 13.2%).

---

## Task 0 — Prep & Dry Run
**Goal:** Confirm environment, dependencies, and permissions.

- [ ] Verify you can run scheduled jobs (Edge Function/Cron/Server job).
- [ ] Confirm outbound HTTP allowed to `https://api.mfapi.in`.
- [ ] Confirm DB access to create tables / views.

**Acceptance:** A one-line “OK” log for each item above.

---

## Task 1 — Create Reference Table `funds` (if missing)
**Goal:** Canonicalize fund identity and metadata.

- Create `funds` with at least:
  - `fund_id` TEXT PRIMARY KEY (AMFI `scheme_code`)
  - `scheme_name` TEXT
  - `isin` TEXT NULL
  - `category` TEXT NULL
  - `benchmark` TEXT NULL
  - `meta_as_of` DATE NULL
  - `backfilled` BOOLEAN DEFAULT FALSE
- Seed `funds.fund_id` and `scheme_name` from existing `nav_data` list.

**Acceptance:**  
- `SELECT COUNT(*) FROM funds` equals count of unique `scheme_code` in `nav_data`.
- Random 5 spot-checks show correct `scheme_name`.

---

## Task 2 — Create `fund_nav_history`
**Goal:** Store full daily NAV history for each fund.

- Create table:
  - `fund_id` TEXT NOT NULL REFERENCES `funds(fund_id)`
  - `date` DATE NOT NULL
  - `nav` NUMERIC(18,6) NOT NULL
  - PRIMARY KEY (`fund_id`,`date`)
  - Index on (`fund_id`,`date`)

**Acceptance:** Table exists; PK and index verified.

---

## Task 3 — One-time Backfill from mfapi.in
**Goal:** Fetch full history for all funds in `funds` where `backfilled=false`.

- For each `fund_id`:
  - Call `GET https://api.mfapi.in/mf/{fund_id}`
  - Parse `data[] -> (date, nav)`
  - Upsert into `fund_nav_history` (skip existing rows)
  - Set `funds.backfilled=true` on success
- Throttle requests (e.g., 5–10 req/sec), exponential backoff on 429/5xx.

**Acceptance:**  
- `fund_nav_history` row count > 0 for sampled funds.  
- `backfilled=true` for those funds.
- Logs show total rows inserted and duration.

**Rollback:** If a fund fails mid-way, leave `backfilled=false` and retry later.

---

## Task 4 — Daily Incremental NAV Appends
**Goal:** Append only new days after backfill.

- Determine last date per (`fund_id`) from `fund_nav_history`.
- Fetch from mfapi.in, filter `date > last_date`.
- Upsert new rows only.
- Run once daily (cron).

**Acceptance:**  
- After run, “last date” equals yesterday/today for active funds.
- Idempotent re-run inserts 0 new rows.

---

## Task 5 — Create `fund_performance_snapshots`
**Goal:** Persist precomputed metrics for fast reads.

- Create table:
  - `fund_id` TEXT NOT NULL REFERENCES `funds(fund_id)`
  - `as_of` DATE NOT NULL
  - `cagr_1y` NUMERIC(12,8) NULL
  - `cagr_3y` NUMERIC(12,8) NULL
  - `cagr_5y` NUMERIC(12,8) NULL
  - `ret_ytd` NUMERIC(12,8) NULL
  - `ret_1m` NUMERIC(12,8) NULL
  - `ret_3m` NUMERIC(12,8) NULL
  - `ret_6m` NUMERIC(12,8) NULL
  - `vol_3y_ann` NUMERIC(12,8) NULL
  - `max_dd_5y` NUMERIC(12,8) NULL
  - `rolling_3y_stability` NUMERIC(12,8) NULL
  - `calc_window_start` DATE NULL
  - `source` TEXT NOT NULL DEFAULT 'mfapi'
  - `calc_status` TEXT NOT NULL DEFAULT 'complete'  -- 'complete'|'partial'
  - PRIMARY KEY (`fund_id`,`as_of`)

**Acceptance:** Table created; PK verified.

---

## Task 6 — Metric Library (Pure Functions)
**Goal:** Implement deterministic computations.

Create a utility module (e.g., `performance.ts` or `performance.py`) with pure functions:

- `cagr(nav_start, nav_end, years)`
- `trailing_return(nav_start, nav_end)`
- `daily_returns(nav_series[])` → array of rᵈ
- `ann_volatility_from_daily(daily_returns[])` → `std(rᵈ)*sqrt(252)`
- `max_drawdown(nav_series[])` (single pass peak/trough)
- `rolling_cagr_stability(nav_series[], window_days)` → fraction of windows with CAGR > 0

**Acceptance:** Unit tests with synthetic series:
- Constant +1% daily → CAGR & volatility behave as expected.
- V-shape series → max drawdown equals constructed value.

---

## Task 7 — Snapshot Calculator (Nightly Job)
**Goal:** Compute metrics for each fund with new NAVs.

For each `fund_id`:
1. `as_of = max(date)` from `fund_nav_history`.
2. Build time windows:
   - 1Y/3Y/5Y endpoints = closest date ≤ (as_of - 365/1095/1825 days).
   - Short-term returns: 1M/3M/6M, YTD using calendar logic.
3. Compute:
   - `cagr_1y|3y|5y` (null if insufficient history)
   - `ret_ytd|1m|3m|6m`
   - `vol_3y_ann` (from last ~3Y daily returns; null if <250 obs)
   - `max_dd_5y` (from last 5Y or all available if <5Y)
   - `rolling_3y_stability` (optional; null if insufficient history)
4. Insert into `fund_performance_snapshots`:
   - Set `calc_window_start`
   - Set `calc_status='partial'` if any metric lacked full window

**Acceptance:**  
- One row per (`fund_id`,`as_of`) created for sample funds.  
- Metrics are non-null where history exists; null with `calc_status='partial'` where not.

---

## Task 8 — Latest View or Table
**Goal:** Efficient lookups for API.

Option A (View):
```sql
CREATE OR REPLACE VIEW fund_performance_latest AS
SELECT DISTINCT ON (fund_id)
  fund_id, as_of, cagr_1y, cagr_3y, cagr_5y,
  ret_ytd, ret_1m, ret_3m, ret_6m,
  vol_3y_ann, max_dd_5y, rolling_3y_stability,
  calc_window_start, source, calc_status
FROM fund_performance_snapshots
ORDER BY fund_id, as_of DESC;
```

Option B (Table + upsert on nightly job).

**Acceptance:**  
- `SELECT * FROM fund_performance_latest WHERE fund_id=<id>` returns a single row with latest `as_of`.

---

## Task 9 — Extend `/funds/{id}/facts` API
**Goal:** Expose metrics in Fund Facts response.

- Join `funds` + `fund_performance_latest` to produce:
  ```json
  {
    "risk_return": {
      "cagr_1y_pct": 0.158, "cagr_3y_pct": 0.132, "cagr_5y_pct": 0.126,
      "ret_ytd_pct": 0.091, "ret_1m_pct": 0.018, "ret_3m_pct": 0.046, "ret_6m_pct": 0.079,
      "vol_3y_ann_pct": 0.135,
      "max_dd_5y_pct": -0.228,
      "rolling_3y_stability": 0.74
    },
    "as_of": "2025-11-07",
    "calc_window_start": "2020-11-09",
    "source": "mfapi",
    "data_freshness": "daily"
  }
  ```
- Zod/Pydantic-validate response; always return fields (use `null` where insufficient).

**Acceptance:** Sample API call responds < 200 ms from cache with validated JSON.

---

## Task 10 — Caching & TTL
**Goal:** Cheap and fast reads.

- Enable HTTP cache (ETag by `as_of` or `Cache-Control: max-age=3600`).
- In-process LRU (optional) keyed by `fund_id:as_of`.

**Acceptance:** Repeat requests are faster (log latency) and return 304 with ETag.

---

## Task 11 — Monitoring & Alerts
**Goal:** Ensure nightly pipeline health.

- Log: funds processed, rows inserted, failures, runtime.
- Alert if:
  - 0 new NAVs across all funds for >2 days
  - Snapshot job fails
  - Snapshots created but `as_of` lags current date by >2 days

**Acceptance:** Trigger a test alert by simulating a failure.

---

## Task 12 — Safety & Guardrails
**Goal:** Keep outputs descriptive, not prescriptive.

- No fund recommendations in any API text.  
- If a metric is partial/insufficient history, return `null` and set `calc_status='partial'`.  
- Round presentation at the **API layer** (e.g., show `12.6%`), keep **full precision** in DB.

**Acceptance:** Unit tests verify absence of recommendation language and correct null-handling.

---

## Task 13 — Optional Retention for Snapshots
**Goal:** Control storage cost without losing auditability.

- Retain last **90 days** of `fund_performance_snapshots` (soft delete or archive older).  
- Keep all `fund_nav_history`.

**Acceptance:** After cleanup, storage reduced; `fund_performance_latest` unaffected.

---

## Task 14 — E2E Dry Run (Staging)
**Goal:** Validate the whole pipeline on a subset of funds.

- Pick 10 funds from `nav_data` (diverse categories).
- Run backfill → daily append → snapshot compute → API.
- Manually sanity-check a couple of metrics vs. external calculators.

**Acceptance:** All steps green; numbers within expected ranges.

---

## Task 15 — Rollout
**Goal:** Enable for all mapped funds.

- Run backfill (idempotent).
- Enable nightly jobs.
- Add a “Data freshness” indicator in your coach UI using `as_of`.

**Acceptance:** Production responses are populated for all mapped funds; nightly job runs clean for 3 days.

---

## Appendix — Edge Cases Checklist
- Funds with <1Y history → many fields `null` and `calc_status='partial'`.
- Holidays/missing NAV dates → choose closest available date ≤ target.
- Scheme mergers/renames → treat by canonical `fund_id` (AMFI code).
- Suspended funds → stop daily appends; keep last snapshot.

