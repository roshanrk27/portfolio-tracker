# Perplexity User Prompt (Batch Funds, v1)

Targets (India Mutual Funds):

{{#funds}}
- Name: {{name}}  
  AMFI Code: {{amfi_code}}  
  ISIN: {{isin}}
{{/funds}}

---

## 🧩 Instructions

Return **only** a JSON array of objects, each strictly following the schema from the system message.  
Do **not** include any text outside the JSON.  
If any data is unavailable or unverifiable reputed or fallback sources, set those fields to `null` and briefly explain the reason in `"notes"`.

### ✅ Rules Recap
- Do not invent or estimate any values.  
- Each fund object in the array must match the schema defined in the system message exactly.  
- Use AMC factsheets, AMFI, SEBI, or reputable aggregators (e.g., Moneycontrol, Value Research, Morningstar India) as sources.  
- Every numeric field must include at least one citation with a `url` and `as_of` date. Do NOT make up the URL
- The output must be **valid JSON**, not text or markdown.
