#!/bin/bash

# Detailed test script that shows full Perplexity response data
# Usage: ./scripts/test-fund-facts-detailed.sh [FUND_ID]

API_KEY="${AI_COACH_API_KEY:-test_api_key_12345_change_in_production}"
FUND_ID="${1:-120437}"  # Default fund ID or pass as argument
BASE_URL="${NEXTJS_BASE_URL:-http://localhost:3000}"

echo "🔍 Detailed Fund Facts Test - Showing Perplexity Data"
echo "══════════════════════════════════════════════════════"
echo "Fund ID: $FUND_ID"
echo "Base URL: $BASE_URL"
echo ""

# Make the request and capture full response
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" -X GET \
  -H "X-AI-Coach-API-Key: $API_KEY" \
  "$BASE_URL/api/ai-coach/funds/$FUND_ID/facts")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
TIME=$(echo "$RESPONSE" | grep "TIME:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d' | sed '/TIME:/d')

echo "📊 Response Status"
echo "──────────────────"
echo "HTTP Status: $HTTP_CODE"
echo "Response Time: ${TIME}s"
echo ""

# Parse and display structured data
echo "📋 Fund Facts Summary"
echo "─────────────────────"
echo "$BODY" | jq '{
  success: .success,
  fund_id: .data.fund_id,
  scheme_name: .data.scheme_name,
  provenance: .data.provenance,
  llm_confidence: .data.llm_confidence,
  llm_as_of: .data.llm_as_of,
  summary: ._summary
}'

echo ""
echo "📈 Risk & Return Metrics (from Perplexity)"
echo "──────────────────────────────────────────"
echo "$BODY" | jq '.data.risk_return'

echo ""
echo "💰 Fees & AUM (from Perplexity)"
echo "────────────────────────────────"
echo "$BODY" | jq '.data.fees_aum'

echo ""
echo "🔗 Sources & Citations (from Perplexity)"
echo "─────────────────────────────────────────"
echo "$BODY" | jq '.data.sources'

echo ""
echo "📝 Notes"
echo "───────"
echo "$BODY" | jq '.data.notes'

echo ""
echo "══════════════════════════════════════════════════════"
echo "📄 Complete JSON Response"
echo "══════════════════════════════════════════════════════"
echo "$BODY" | jq '.'

echo ""
echo "💡 Tips:"
echo "   - If 'provenance' is 'deterministic', LLM is disabled or cache miss"
echo "   - If 'provenance' is 'llm+cited', data came from Perplexity"
echo "   - Check 'sources' array for citation URLs"
echo "   - 'llm_confidence' shows data quality: high/medium/low"
echo ""
echo "🔍 To see RAW Perplexity response (exact JSON from Perplexity):"
echo "   npx tsx scripts/show-raw-perplexity-response.ts $FUND_ID"
echo ""
echo "   Or query database:"
echo "   SELECT payload FROM fund_facts_llm WHERE fund_id = '$FUND_ID';"

