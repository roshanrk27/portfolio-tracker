/**
 * Script to fetch and display raw Perplexity response from database
 * Usage: npx tsx scripts/show-raw-perplexity-response.ts [FUND_ID]
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function showRawPerplexityResponse(fundId: string) {
  console.log('🔍 Fetching Raw Perplexity Response from Cache')
  console.log('══════════════════════════════════════════════════════')
  console.log(`Fund ID: ${fundId}\n`)

  try {
    const { data, error } = await supabase
      .from('fund_facts_llm')
      .select('fund_id, as_of_month, confidence, payload, sources, created_at')
      .eq('fund_id', fundId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ Database Error:', error.message)
      process.exit(1)
    }

    if (!data) {
      console.log('⚠️  No cached data found for this fund.')
      console.log('   Make a request to the API first to populate the cache.')
      console.log(`   curl -X GET -H "X-AI-Coach-API-Key: YOUR_KEY" "http://localhost:3002/api/ai-coach/funds/${fundId}/facts"`)
      process.exit(1)
    }

    console.log('📊 Cache Metadata:')
    console.log('──────────────────')
    console.log(`Fund ID: ${data.fund_id}`)
    console.log(`As Of Month: ${data.as_of_month}`)
    console.log(`Confidence: ${data.confidence}`)
    console.log(`Created At: ${data.created_at}`)
    console.log(`Source Count: ${Array.isArray(data.sources) ? data.sources.length : 0}`)
    console.log('')

    console.log('══════════════════════════════════════════════════════')
    console.log('📄 Raw Perplexity Payload (Exact JSON from Perplexity)')
    console.log('══════════════════════════════════════════════════════')
    console.log(JSON.stringify(data.payload, null, 2))
    console.log('')

    console.log('══════════════════════════════════════════════════════')
    console.log('🔗 Sources Array')
    console.log('══════════════════════════════════════════════════════')
    console.log(JSON.stringify(data.sources, null, 2))
    console.log('')

    // Show structured breakdown
    const payload = data.payload as any
    if (payload && Array.isArray(payload) && payload.length > 0) {
      const firstItem = payload[0]
      console.log('══════════════════════════════════════════════════════')
      console.log('📋 Structured Breakdown')
      console.log('══════════════════════════════════════════════════════')
      console.log(`Version: ${firstItem.version}`)
      console.log(`Scheme ID: ${firstItem.scheme_id}`)
      console.log(`As Of: ${firstItem.as_of}`)
      console.log(`Confidence: ${firstItem.confidence}`)
      console.log('')
      console.log('Identity:')
      console.log(JSON.stringify(firstItem.identity, null, 2))
      console.log('')
      console.log('Risk & Return:')
      console.log(JSON.stringify(firstItem.risk_return, null, 2))
      console.log('')
      console.log('Fees & AUM:')
      console.log(JSON.stringify(firstItem.fees_aum, null, 2))
      console.log('')
      console.log('Source Evidence:')
      console.log(JSON.stringify(firstItem.source_evidence, null, 2))
      console.log('')
      if (firstItem.notes) {
        console.log('Notes:')
        console.log(firstItem.notes)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Get fund ID from command line or prompt
const fundId = process.argv[2]

if (!fundId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question('Enter Fund ID (or press Enter for 120437): ', (answer) => {
    const id = answer.trim() || '120437'
    rl.close()
    showRawPerplexityResponse(id)
  })
} else {
  showRawPerplexityResponse(fundId)
}

