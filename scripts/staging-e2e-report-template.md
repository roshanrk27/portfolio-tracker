# Staging E2E Validation Report

**Date:** [YYYY-MM-DD]  
**Environment:** [staging/production]  
**Validated By:** [Name]

---

## Test Summary

- **Total Funds Tested:** [number]
- **Successful:** [number]
- **Failed:** [number]
- **Success Rate:** [percentage]%

---

## Test Environment

- **API Base URL:** [URL]
- **Min Confidence Threshold:** [high/medium]
- **Max Latency Target:** 500ms
- **Cache Status:** [warm/cold]

### Environment Variables
- `FUND_FACTS_USE_LLM`: [true/false]
- `FUND_FACTS_MIN_CONFIDENCE`: [high/medium]
- `FUND_FACTS_TTL_DAYS`: [number]
- `FUND_FACTS_MAX_DAILY_CALLS`: [number]

---

## Fund List

| # | Fund ID | Scheme Name | Goal Name | User ID |
|---|---------|-------------|-----------|---------|
| 1 | [id] | [name] | [goal] | [id] |
| 2 | [id] | [name] | [goal] | [id] |
| ... | ... | ... | ... | ... |

---

## Results Summary

### Confidence Distribution
- **High:** [number] ([percentage]%)
- **Medium:** [number] ([percentage]%)
- **Low:** [number] ([percentage]%)
- **Missing:** [number] ([percentage]%)

**Acceptance Criteria:** ≥ 70% meet minimum confidence threshold  
**Result:** ✅ Pass / ❌ Fail ([actual percentage]%)

### Latency Statistics
- **Min:** [number]ms
- **Max:** [number]ms
- **Average:** [number]ms
- **P95:** [number]ms

**Acceptance Criteria:** Average < 500ms (with warm cache)  
**Result:** ✅ Pass / ❌ Fail ([actual average]ms)

### Source Quality
- **With AMC/AMFI Links:** [number] ([percentage]%)
- **Without AMC/AMFI Links:** [number] ([percentage]%)
- **Total Sources:** [number]

**Acceptance Criteria:** ≥ 80% have AMC/AMFI sources  
**Result:** ✅ Pass / ❌ Fail ([actual percentage]%)

---

## Detailed Results

### Fund 1: [Scheme Name] ([Fund ID])

- **Status:** ✅ Success / ❌ Failed
- **Provenance:** [deterministic/llm+cited]
- **Confidence:** [high/medium/low/missing]
- **Latency:** [number]ms
- **Sources:** [number] (AMC/AMFI: Yes/No)
- **Errors:** [list any errors]
- **Warnings:** [list any warnings]

**Response Sample:**
```json
[Include relevant portion of response]
```

---

### Fund 2: [Scheme Name] ([Fund ID])

[Repeat for each fund]

---

## Discrepancies and Issues

### Issue 1: [Title]

**Description:** [Detailed description]  
**Impact:** [High/Medium/Low]  
**Status:** [Open/Resolved]  
**Resolution:** [If resolved, describe fix]

---

### Issue 2: [Title]

[Repeat for each issue]

---

## Screenshots and Logs

### Screenshots
- [Link to screenshot 1]
- [Link to screenshot 2]

### Logs
- [Link to log file 1]
- [Link to log file 2]

### Generated Files
- `staging-e2e-funds.json` - Fund discovery results
- `staging-e2e-seeded.json` - Cache seeding results
- `staging-e2e-results.json` - Full validation results

---

## Conclusion

[Summary of overall validation results]

**Recommendation:** [Proceed to production / Fix issues / Re-test]

---

## Next Steps

- [ ] Review discrepancies
- [ ] Fix identified issues
- [ ] Re-run validation if needed
- [ ] Update documentation
- [ ] Proceed to production rollout

