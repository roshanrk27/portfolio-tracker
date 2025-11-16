#!/bin/bash

# Quick test script for Fund Facts endpoint
# Usage: ./scripts/quick-test-fund-facts.sh [FUND_ID]

API_KEY="${AI_COACH_API_KEY:-your_key_here}"
FUND_ID="${1:-120503}"  # Default fund ID or pass as argument
BASE_URL="${NEXTJS_BASE_URL:-http://localhost:3000}"

echo "🧪 Testing Fund Facts Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Fund ID: $FUND_ID"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Basic Request
echo "📋 Test 1: Basic Request"
echo "─────────────────────────"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" -X GET \
  -H "X-AI-Coach-API-Key: $API_KEY" \
  "$BASE_URL/api/ai-coach/funds/$FUND_ID/facts")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
TIME=$(echo "$RESPONSE" | grep "TIME:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d' | sed '/TIME:/d')

echo "HTTP Status: $HTTP_CODE"
echo "Response Time: ${TIME}s"
echo ""
echo "$BODY" | jq '{
  success,
  provenance: .data.provenance,
  llm_confidence: .data.llm_confidence,
  source_count: (.data.sources | length),
  has_risk_return: (.data.risk_return | length > 0),
  has_fees_aum: (.data.fees_aum | length > 0),
  # Show actual fund facts data
  fund_id: .data.fund_id,
  scheme_name: .data.scheme_name,
  risk_return: .data.risk_return,
  fees_aum: .data.fees_aum,
  sources: .data.sources,
  llm_as_of: .data.llm_as_of,
  summary: ._summary
}'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2: Full Response with All Fund Facts Data
echo "📋 Test 2: Full Fund Facts Data (Perplexity Response)"
echo "──────────────────────────────────────────────────────"
curl -s -X GET \
  -H "X-AI-Coach-API-Key: $API_KEY" \
  "$BASE_URL/api/ai-coach/funds/$FUND_ID/facts" \
  | jq '{
    # Metadata
    success: .success,
    timestamp: .timestamp,
    summary: ._summary,
    
    # Fund Identity
    fund_id: .data.fund_id,
    scheme_name: .data.scheme_name,
    provenance: .data.provenance,
    
    # LLM Metadata
    llm_confidence: .data.llm_confidence,
    llm_as_of: .data.llm_as_of,
    
    # Risk & Return Metrics (from Perplexity)
    risk_return: .data.risk_return,
    
    # Fees & AUM (from Perplexity)
    fees_aum: .data.fees_aum,
    
    # Sources (citations from Perplexity)
    sources: .data.sources,
    
    # Notes
    notes: .data.notes
  }'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 3: Pretty Print Full Response
echo "📋 Test 3: Complete Raw Response"
echo "─────────────────────────────────"
echo "Full JSON response:"
curl -s -X GET \
  -H "X-AI-Coach-API-Key: $API_KEY" \
  "$BASE_URL/api/ai-coach/funds/$FUND_ID/facts" \
  | jq '.'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 3: Error Handling - Invalid Fund ID
echo "📋 Test 3: Error Handling (Invalid Fund ID)"
echo "────────────────────────────────────────────"
ERROR_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET \
  -H "X-AI-Coach-API-Key: $API_KEY" \
  "$BASE_URL/api/ai-coach/funds/invalid-id/facts")

ERROR_HTTP=$(echo "$ERROR_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
ERROR_BODY=$(echo "$ERROR_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $ERROR_HTTP"
echo "$ERROR_BODY" | jq '{success, error}' 2>/dev/null || echo "$ERROR_BODY"

echo ""
echo "✅ Quick test complete!"
echo ""
echo "💡 Tips:"
echo "   - Set AI_COACH_API_KEY environment variable"
echo "   - Pass fund ID as argument: ./scripts/quick-test-fund-facts.sh 120503"
echo "   - Check logs for detailed request information"

