# Simple End-to-End Testing Guide for Fund Facts

This guide provides a straightforward way to test the `/api/ai-coach/funds/{id}/facts` endpoint.

## Prerequisites

0. **Install jq (JSON processor) - Required for pretty output:**

   **Windows Options:**
   
   **Option A: Using Chocolatey (Recommended)**
   ```powershell
   # Install Chocolatey first if you don't have it: https://chocolatey.org/install
   choco install jq
   ```
   
   **Option B: Using Scoop**
   ```powershell
   # Install Scoop first if you don't have it: https://scoop.sh
   scoop install jq
   ```
   
   **Option C: Download Windows Binary**
   - Download from: https://github.com/jqlang/jq/releases
   - Look for `jq-win64.exe` or `jq-win32.exe`
   - Rename to `jq.exe` and add to your PATH
   
   **Option D: Use Git Bash**
   - Git Bash (comes with Git for Windows) may already have jq
   - Or install via package manager in Git Bash
   
   **Option E: Use WSL (Windows Subsystem for Linux)**
   ```bash
   sudo apt-get update
   sudo apt-get install jq
   ```
   
   **Option F: Skip jq (Use Raw JSON)**
   - Remove `| jq .` from curl commands
   - Or use the no-jq script: `test-fund-facts-detailed-no-jq.sh`
   
   **Verify Installation:**
   ```bash
   jq --version
   ```

1. **Environment Variables** (in `.env.local` or your environment):
   ```bash
   AI_COACH_API_KEY=your_api_key_here
   PERPLEXITY_API_KEY=your_perplexity_key_here  # Optional for LLM testing
   FUND_FACTS_USE_LLM=false  # Start with false, then enable
   FUND_FACTS_MIN_CONFIDENCE=medium
   FUND_FACTS_TTL_DAYS=30
   FUND_FACTS_MAX_DAILY_CALLS=100
   ```

2. **Database Migrations Applied:**
   - Run `20251108_create_fund_facts_llm.sql`
   - Run `20251108_create_fund_facts_daily_budget.sql`

3. **Get a Test Fund ID:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT scheme_code, scheme_name 
   FROM nav_data 
   WHERE scheme_name IS NOT NULL 
   LIMIT 1;
   ```
   **Record your fund ID:** `FUND_ID = 120437`

4. **Start Your Dev Server:**
   ```bash
   npm run dev
   ```

---

## Test 1: Feature Flag Disabled (Deterministic-Only)

**Setup:**
```bash
export FUND_FACTS_USE_LLM=false
# Restart your dev server if needed
```

**Test:**
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/YOUR_FUND_ID/facts" \
  | jq .
```

**Expected:**
- ✅ HTTP 200
- ✅ `"success": true`
- ✅ `"provenance": "deterministic"`
- ✅ `"notes.llm"` mentions LLM disabled
- ✅ `"risk_return": {}` and `"fees_aum": {}` are empty

---

## Test 2: Enable LLM and Test Cache Miss (First Call)

**Setup:**
```bash
export FUND_FACTS_USE_LLM=true
export PERPLEXITY_API_KEY=your_key_here
# Restart your dev server
```

**Clear cache first (optional):**
```sql
-- In Supabase SQL Editor
DELETE FROM fund_facts_llm WHERE fund_id = 'YOUR_FUND_ID';
```

**Test:**
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/YOUR_FUND_ID/facts" \
  -w "\n\nTime: %{time_total}s\n" \
  | jq .
```

**Expected:**
- ✅ HTTP 200
- ✅ `"success": true`
- ✅ `"provenance": "llm+cited"`
- ✅ `"llm_confidence": "high"` or `"medium"`
- ✅ `"sources"` array with at least one URL
- ✅ `"risk_return"` and `"fees_aum"` have data
- ⏱️ Latency: 1-5 seconds (Perplexity API call)

**Verify Cache:**
```sql
-- Check cache was populated
SELECT fund_id, confidence, created_at, as_of_month
FROM fund_facts_llm 
WHERE fund_id = 'YOUR_FUND_ID';
```

---

## Test 3: Cache Hit (Second Call)

**Test again immediately:**
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/YOUR_FUND_ID/facts" \
  -w "\n\nTime: %{time_total}s\n" \
  | jq .
```

**Expected:**
- ✅ HTTP 200
- ✅ `"provenance": "llm+cited"`
- ✅ Same data as Test 2
- ⏱️ Latency: < 200ms (much faster - from cache)
- ✅ `"_summary"` mentions "retrieved from cache"

---

## Test 4: Error Handling

### Invalid Fund ID
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/invalid-id/facts" \
  | jq .
```
**Expected:** HTTP 400 with error message

### Non-existent Fund
```bash
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/999999/facts" \
  | jq .
```
**Expected:** HTTP 404 with "Fund not found"

### Missing API Key
```bash
curl -X GET \
  "http://localhost:3000/api/ai-coach/funds/YOUR_FUND_ID/facts" \
  | jq .
```
**Expected:** HTTP 401 with "Unauthorized"

---

## Test 5: Daily Budget Limit

**Setup:**
```bash
export FUND_FACTS_MAX_DAILY_CALLS=1
# Restart server
```

**Clear cache and make one call:**
```sql
DELETE FROM fund_facts_llm WHERE fund_id = 'YOUR_FUND_ID';
```

```bash
# First call - should succeed
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/YOUR_FUND_ID/facts" \
  | jq .

# Clear cache again
# Then second call - should fail with 429
curl -X GET \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/ai-coach/funds/YOUR_FUND_ID/facts" \
  | jq .
```

**Expected:**
- First call: ✅ HTTP 200
- Second call: ❌ HTTP 429 with `"rate_limit"` object

---

## Quick Test Script

Save this as `scripts/quick-test-fund-facts.sh`:

```bash
#!/bin/bash

API_KEY="${AI_COACH_API_KEY:-your_key_here}"
FUND_ID="${1:-120503}"  # Default fund ID or pass as argument
BASE_URL="${NEXTJS_BASE_URL:-http://localhost:3000}"

echo "Testing Fund Facts Endpoint"
echo "Fund ID: $FUND_ID"
echo "Base URL: $BASE_URL"
echo ""

echo "Test 1: Basic Request"
curl -s -X GET \
  -H "X-AI-Coach-API-Key: $API_KEY" \
  "$BASE_URL/api/ai-coach/funds/$FUND_ID/facts" \
  | jq '{success, provenance, llm_confidence, latency: ._metadata}'

echo ""
echo "Test 2: Check Response Structure"
curl -s -X GET \
  -H "X-AI-Coach-API-Key: $API_KEY" \
  "$BASE_URL/api/ai-coach/funds/$FUND_ID/facts" \
  | jq '{
    success,
    has_data: (.data != null),
    has_provenance: (.data.provenance != null),
    has_sources: (.data.sources != null),
    source_count: (.data.sources | length)
  }'
```

**Usage:**
```bash
chmod +x scripts/quick-test-fund-facts.sh
export AI_COACH_API_KEY=your_key
./scripts/quick-test-fund-facts.sh 120503
```

---

## What to Check

### ✅ Success Indicators:
- [ ] All requests return HTTP 200 (except error tests)
- [ ] Response has `"success": true`
- [ ] `X-Request-ID` header present
- [ ] Cache hit is much faster than cache miss
- [ ] Sources include valid URLs
- [ ] No recommendation language in summaries

### ⚠️ Check Logs:
Look for structured JSON logs in your console:
```json
{"request_id":"...","fund_id":"120503","cache_status":"hit","confidence":"high","latency_ms":45,"adapter_status":"success"}
```

### 🔍 Database Checks:
```sql
-- Check cache
SELECT * FROM fund_facts_llm WHERE fund_id = 'YOUR_FUND_ID';

-- Check daily budget
SELECT * FROM fund_facts_daily_budget WHERE date = CURRENT_DATE;
```

---

## Troubleshooting

**Issue: "Fund not found"**
- Verify fund ID exists in `nav_data` table
- Check `scheme_code` matches your fund ID

**Issue: "Unauthorized"**
- Verify `AI_COACH_API_KEY` is set correctly
- Check the key matches what's in your environment

**Issue: Cache not working**
- Check `FUND_FACTS_USE_LLM=true`
- Verify cache entry exists in database
- Check TTL hasn't expired

**Issue: Perplexity not called**
- Verify `PERPLEXITY_API_KEY` is set
- Check daily budget hasn't been exceeded
- Look for errors in logs

---

## Next Steps

Once basic tests pass:
1. Run the staging E2E scripts (`staging-e2e-validate.ts`)
2. Test with multiple funds
3. Monitor logs for any issues
4. Check database for cache population

