#!/bin/bash

# Detailed test script WITHOUT jq dependency
# Usage: ./scripts/test-fund-facts-detailed-no-jq.sh [FUND_ID]

API_KEY="${AI_COACH_API_KEY:-test_api_key_12345_change_in_production}"
FUND_ID="${1:-120437}"
BASE_URL="${NEXTJS_BASE_URL:-http://localhost:3002}"

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

echo "══════════════════════════════════════════════════════"
echo "📄 Complete JSON Response (Raw)"
echo "══════════════════════════════════════════════════════"
echo "$BODY"

echo ""
echo "💡 Tip: Install jq for pretty-printed JSON output"
echo "   Windows: choco install jq  (or see test-fund-facts-e2e.md)"

