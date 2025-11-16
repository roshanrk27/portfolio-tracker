/**
 * Staging E2E: Find Funds Linked to Goals
 * 
 * Discovers 10 funds that are linked to real goals via goal_scheme_mapping.
 * Outputs a JSON file with fund IDs and metadata for use in seeding and validation.
 * 
 * Usage:
 *   npx tsx scripts/staging-e2e-find-funds.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

interface FundInfo {
  fund_id: string // scheme_code from nav_data
  scheme_name: string
  scheme_code: string
  goal_id: string
  goal_name: string
  user_id: string
  folio?: string
  allocation_percentage?: number
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function findFundsLinkedToGoals(): Promise<FundInfo[]> {
  console.log('🔍 Finding funds linked to goals...\n')

  // Step 1: Get goal mappings with scheme_name
  const { data: mappings, error: mappingsError } = await supabase
    .from('goal_scheme_mapping')
    .select('goal_id, scheme_name, folio, allocation_percentage')
    .not('scheme_name', 'is', null)
    .limit(100) // Get a good sample

  if (mappingsError) {
    throw new Error(`Failed to fetch goal mappings: ${mappingsError.message}`)
  }

  if (!mappings || mappings.length === 0) {
    throw new Error('No goal mappings found. Please ensure goals are mapped to funds.')
  }

  console.log(`Found ${mappings.length} goal mappings\n`)

  // Step 2: Get unique scheme names
  const uniqueSchemeNames = Array.from(new Set(mappings.map(m => m.scheme_name)))
  console.log(`Found ${uniqueSchemeNames.length} unique scheme names\n`)

  // Step 3: Match scheme_name to nav_data to get scheme_code
  const { data: navData, error: navError } = await supabase
    .from('nav_data')
    .select('scheme_code, scheme_name')
    .in('scheme_name', uniqueSchemeNames)
    .not('scheme_code', 'is', null)

  if (navError) {
    throw new Error(`Failed to fetch NAV data: ${navError.message}`)
  }

  if (!navData || navData.length === 0) {
    throw new Error('No matching NAV data found. Scheme names may not match.')
  }

  console.log(`Found ${navData.length} matching funds in nav_data\n`)

  // Step 4: Create a map of scheme_name -> scheme_code
  const schemeCodeMap = new Map<string, string>()
  for (const nav of navData) {
    if (nav.scheme_name && nav.scheme_code) {
      schemeCodeMap.set(nav.scheme_name, nav.scheme_code)
    }
  }

  // Step 5: Get goal details
  const goalIds = Array.from(new Set(mappings.map(m => m.goal_id)))
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('id, name, user_id')
    .in('id', goalIds)

  if (goalsError) {
    throw new Error(`Failed to fetch goals: ${goalsError.message}`)
  }

  const goalMap = new Map<string, { name: string; user_id: string }>()
  for (const goal of goals || []) {
    goalMap.set(goal.id, { name: goal.name, user_id: goal.user_id })
  }

  // Step 6: Build fund info list
  const fundInfoList: FundInfo[] = []
  const seenFundIds = new Set<string>()

  for (const mapping of mappings) {
    const schemeCode = schemeCodeMap.get(mapping.scheme_name)
    if (!schemeCode) {
      continue // Skip if no scheme_code found
    }

    // Avoid duplicates (same fund_id)
    if (seenFundIds.has(schemeCode)) {
      continue
    }

    const goal = goalMap.get(mapping.goal_id)
    if (!goal) {
      continue
    }

    fundInfoList.push({
      fund_id: schemeCode,
      scheme_name: mapping.scheme_name,
      scheme_code: schemeCode,
      goal_id: mapping.goal_id,
      goal_name: goal.name,
      user_id: goal.user_id,
      folio: mapping.folio || undefined,
      allocation_percentage: mapping.allocation_percentage || undefined
    })

    seenFundIds.add(schemeCode)

    // Stop when we have 10 funds
    if (fundInfoList.length >= 10) {
      break
    }
  }

  return fundInfoList
}

async function main() {
  try {
    const funds = await findFundsLinkedToGoals()

    if (funds.length === 0) {
      console.error('❌ No funds found linked to goals')
      process.exit(1)
    }

    console.log(`✅ Found ${funds.length} funds linked to goals:\n`)
    funds.forEach((fund, index) => {
      console.log(`${index + 1}. ${fund.scheme_name}`)
      console.log(`   Fund ID: ${fund.fund_id}`)
      console.log(`   Goal: ${fund.goal_name}`)
      console.log(`   User ID: ${fund.user_id}\n`)
    })

    // Write to JSON file
    const outputPath = path.join(process.cwd(), 'scripts', 'staging-e2e-funds.json')
    fs.writeFileSync(outputPath, JSON.stringify(funds, null, 2))
    console.log(`📄 Fund list saved to: ${outputPath}`)

    console.log('\n✅ Discovery complete!')
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()

