/**
 * Script to show the exact prompt sent to Perplexity
 * Usage: 
 *   npx tsx scripts/show-perplexity-prompt.ts [FUND_ID] [SCHEME_NAME] [ISIN]
 *   OR (with Supabase): npx tsx scripts/show-perplexity-prompt.ts [FUND_ID]
 * 
 * Examples:
 *   npx tsx scripts/show-perplexity-prompt.ts 120437
 *   npx tsx scripts/show-perplexity-prompt.ts 120437 "ICICI Prudential Focused Equity Fund" "INF109K01AB1"
 */

import { buildPerplexityMessages } from '../lib/ai-coach-api/promptLoader'
import type { FundFactsPromptContext } from '../lib/ai-coach-api/types'

async function showPrompt(fundId: string, schemeName?: string, isin?: string) {
  console.log('🔍 Perplexity Prompt Generator')
  console.log('══════════════════════════════════════════════════════')
  console.log(`Fund ID: ${fundId}\n`)

  try {
    let finalSchemeName = schemeName || null
    let finalIsin = isin || null

    // If scheme name or ISIN not provided, try to fetch from Supabase (optional)
    if (!finalSchemeName || !finalIsin) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseKey) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(supabaseUrl, supabaseKey)

          const { data: navData } = await supabase
            .from('nav_data')
            .select('scheme_name, isin_div_payout, isin_div_reinvestment, nav_value')
            .eq('scheme_code', fundId)
            .limit(1)
            .maybeSingle()

          if (navData) {
            if (!finalSchemeName) {
              finalSchemeName = (navData as { scheme_name?: string | null }).scheme_name || null
            }
            if (!finalIsin) {
              finalIsin = (navData as { isin_div_payout?: string | null; isin_div_reinvestment?: string | null }).isin_div_payout ||
                          (navData as { isin_div_payout?: string | null; isin_div_reinvestment?: string | null }).isin_div_reinvestment ||
                          null
            }
          }
        } catch (supabaseError) {
          // Supabase lookup failed, but continue with provided values
          console.warn('⚠️  Could not fetch from Supabase, using provided values only')
        }
      }
    }

    // Build the prompt context
    const promptContext: FundFactsPromptContext = {
      funds: [
        {
          scheme_name: finalSchemeName || '',
          fund_id: fundId,
          isin: finalIsin,
          latest_nav: null,
          current_value: null
        }
      ]
    }

    // Generate the prompts
    const { system, user } = buildPerplexityMessages(promptContext)

    console.log('📋 Fund Information:')
    console.log('─────────────────────')
    console.log(`Scheme Name: ${finalSchemeName || 'N/A'}`)
    console.log(`Fund ID (AMFI): ${fundId}`)
    console.log(`ISIN: ${finalIsin || 'N/A'}`)
    console.log('')

    console.log('══════════════════════════════════════════════════════')
    console.log('📝 SYSTEM PROMPT SENT TO PERPLEXITY')
    console.log('══════════════════════════════════════════════════════')
    console.log(system)
    console.log('══════════════════════════════════════════════════════')
    console.log('')

    console.log('══════════════════════════════════════════════════════')
    console.log('📝 USER PROMPT SENT TO PERPLEXITY')
    console.log('══════════════════════════════════════════════════════')
    console.log(user)
    console.log('══════════════════════════════════════════════════════')
    console.log('')

    console.log('💡 Note:')
    console.log('   - System prompt is sent as role: "system"')
    console.log('   - User prompt is sent as role: "user"')
    console.log('   - Perplexity uses "sonar-pro" model')
    console.log('   - Temperature is set to 0 for deterministic responses')
    console.log('   - Max output tokens: 2048')

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Parse command line arguments
const fundId = process.argv[2]
const schemeName = process.argv[3]
const isin = process.argv[4]

if (!fundId) {
  console.error('Usage: npx tsx scripts/show-perplexity-prompt.ts [FUND_ID] [SCHEME_NAME] [ISIN]')
  console.error('')
  console.error('Examples:')
  console.error('  npx tsx scripts/show-perplexity-prompt.ts 120437')
  console.error('  npx tsx scripts/show-perplexity-prompt.ts 120437 "ICICI Prudential Focused Equity Fund"')
  console.error('  npx tsx scripts/show-perplexity-prompt.ts 120437 "ICICI Prudential Focused Equity Fund" "INF109K01AB1"')
  console.error('')
  console.error('Note: If SCHEME_NAME or ISIN are not provided, the script will try to fetch')
  console.error('      them from Supabase (if env variables are set). Otherwise uses "N/A".')
  process.exit(1)
}

showPrompt(fundId, schemeName, isin)

