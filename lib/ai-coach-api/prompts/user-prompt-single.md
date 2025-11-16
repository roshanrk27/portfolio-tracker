Target fund (India Mutual Fund):

Name: {{fund_name}}  
AMFI Code: {{fund_amfi_code}}  
ISIN: {{fund_isin}}

---

## 🧩 Instructions

Return JSON exactly matching the schema from the system message.  
Do **not** include any text outside the JSON.  
If any data is unavailable or unverifiable from reputed or fallback sources, set those fields to `null` and briefly explain the reason in `"notes"`.

### ✅ Rules Recap
- Do not make up values or infer ratios. Always use facts to which you can reliably provide a source. 
- Use hierarcy of sources as listed in system prompt only.  
- Include citations (`url` + `as_of`) for each numeric field you report. DO not make up the URLs
- Output must be valid JSON that conforms to the schema provided in the system message. No markdown tags.
