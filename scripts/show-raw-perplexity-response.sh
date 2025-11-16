#!/bin/bash

# Script to show raw Perplexity response from database cache
# Usage: ./scripts/show-raw-perplexity-response.sh [FUND_ID]

FUND_ID="${1:-120437}"

echo "🔍 Raw Perplexity Response Viewer"
echo "══════════════════════════════════════════════════════"
echo "Fund ID: $FUND_ID"
echo ""

echo "📋 Option 1: Query Database Directly (Supabase SQL Editor)"
echo "──────────────────────────────────────────────────────────"
echo "Run this SQL query in Supabase SQL Editor:"
echo ""
echo "SELECT"
echo "  fund_id,"
echo "  as_of_month,"
echo "  confidence,"
echo "  payload,"
echo "  sources,"
echo "  created_at"
echo "FROM fund_facts_llm"
echo "WHERE fund_id = '$FUND_ID'"
echo "ORDER BY created_at DESC"
echo "LIMIT 1;"
echo ""

echo "📋 Option 2: Use Supabase CLI (if installed)"
echo "──────────────────────────────────────────────"
echo "supabase db query \""
echo "  SELECT payload FROM fund_facts_llm"
echo "  WHERE fund_id = '$FUND_ID'"
echo "  ORDER BY created_at DESC LIMIT 1;"
echo "\" | jq '.[0].payload'"
echo ""

echo "📋 Option 3: Query via API (if you have admin access)"
echo "───────────────────────────────────────────────────────"
echo "The raw Perplexity payload is stored in the 'payload' field"
echo "of the fund_facts_llm table. It contains the exact JSON"
echo "that Perplexity returned, including:"
echo "  - version: '1.0'"
echo "  - scheme_id: fund identifier"
echo "  - as_of: date string"
echo "  - identity: fund identity details"
echo "  - fees_aum: expense ratio and AUM"
echo "  - risk_return: all performance metrics"
echo "  - source_evidence: array of citations"
echo "  - confidence: 'high' | 'medium' | 'low'"
echo "  - notes: any additional notes"
echo ""

echo "💡 To see the raw payload structure, check:"
echo "   lib/ai-coach-api/types.ts - FundFactsLLM interface"
echo "   lib/ai-coach-api/schema.ts - FundFactsLLMSchema"

