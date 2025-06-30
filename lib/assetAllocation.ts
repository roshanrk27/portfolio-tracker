/**
 * Asset Allocation Utility Functions
 * Categorizes mutual fund schemes into equity, debt, and hybrid categories
 */

export interface AssetCategory {
  category: string
  color: string
  keywords: string[]
}

export const ASSET_CATEGORIES: AssetCategory[] = [
  {
    category: 'Debt',
    color: '#10b981',
    keywords: [
      // Debt-specific keywords (check these first)
      'liquid', 'overnight', 'ultra short term', 'short term', 'medium term', 'long term',
      'gilt', 'government securities', 'treasury', 'money market', 'banking & psu',
      'corporate bond', 'credit risk', 'income', 'debt', 'floating rate',
      'banking and psu', 'psu', 'corporate', 'bond', 'securities',
      'overnight fund', 'liquid fund', 'ultra short term fund', 'short term fund',
      'medium term fund', 'long term fund', 'gilt fund', 'income fund', 'debt fund',
      // Additional Indian MF debt keywords
      'banking & psu debt', 'corporate bond fund', 'credit risk fund', 'floating rate fund',
      'government securities fund', 'money market fund', 'treasury bill', 'commercial paper',
      'certificate of deposit', 'banking psu', 'psu debt', 'corporate debt',
      'short duration', 'medium duration', 'long duration', 'ultra short duration',
      'low duration', 'medium to long duration', 'long term debt', 'short term debt'
    ]
  },
  {
    category: 'Hybrid',
    color: '#f59e0b',
    keywords: [
      // Hybrid-specific keywords (check these second)
      'hybrid', 'balanced', 'aggressive', 'conservative', 'equity savings',
      'dynamic asset allocation', 'multi asset', 'arbitrage', 'balanced advantage',
      'equity & debt', 'debt & equity', 'equity and debt', 'debt and equity',
      'hybrid fund', 'balanced fund', 'aggressive fund', 'conservative fund',
      'equity savings fund', 'dynamic asset allocation fund', 'multi asset fund',
      'arbitrage fund', 'balanced advantage fund',
      // Additional Indian MF hybrid keywords
      'equity hybrid', 'debt hybrid', 'conservative hybrid', 'aggressive hybrid',
      'balanced hybrid', 'equity savings fund', 'dynamic asset allocation',
      'multi asset allocation', 'arbitrage fund', 'balanced advantage fund',
      'equity & debt fund', 'debt & equity fund', 'equity and debt fund', 'debt and equity fund'
    ]
  },
  {
    category: 'Equity',
    color: '#3b82f6',
    keywords: [
      // Equity-specific keywords (check these last as fallback)
      'equity', 'growth', 'large cap', 'mid cap', 'small cap', 'multicap',
      'flexi cap', 'value', 'momentum', 'quality', 'dividend yield',
      'sector', 'thematic', 'index', 'nifty', 'sensex', 'bse', 'nse',
      'largecap', 'midcap', 'smallcap', 'multicap', 'flexicap',
      'equity fund', 'growth fund', 'large cap fund', 'mid cap fund', 'small cap fund',
      'multicap fund', 'flexi cap fund', 'value fund', 'momentum fund', 'quality fund',
      'dividend yield fund', 'sector fund', 'thematic fund', 'index fund',
      // Additional Indian MF equity keywords
      'large cap equity', 'mid cap equity', 'small cap equity', 'multi cap equity',
      'flexi cap equity', 'value equity', 'momentum equity', 'quality equity',
      'dividend yield equity', 'sector equity', 'thematic equity', 'index equity',
      'nifty 50', 'sensex 30', 'bse 100', 'nse 100', 'nifty next 50',
      'large cap growth', 'mid cap growth', 'small cap growth', 'multi cap growth',
      'flexi cap growth', 'value growth', 'momentum growth', 'quality growth'
    ]
  }
]

/**
 * Categorize a scheme name into asset allocation category
 */
export function categorizeScheme(schemeName: string): AssetCategory {
  const normalizedName = schemeName.toLowerCase().trim()
  
  // Check each category in order (Debt first, then Hybrid, then Equity)
  for (const category of ASSET_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        console.log(`Scheme "${schemeName}" categorized as ${category.category} (matched keyword: "${keyword}")`)
        return category
      }
    }
  }
  
  // If no match found, default to hybrid (more conservative than equity)
  console.log(`Scheme "${schemeName}" defaulted to Hybrid (no keyword match)`)
  return ASSET_CATEGORIES[1] // Hybrid (index 1 after reordering)
}

/**
 * Calculate asset allocation for a list of schemes with their values
 */
export function calculateAssetAllocation(
  schemes: Array<{ scheme_name: string; current_value: number }>
) {
  const allocation: Record<string, { value: number; count: number }> = {}
  
  // Initialize categories
  ASSET_CATEGORIES.forEach(cat => {
    allocation[cat.category] = { value: 0, count: 0 }
  })
  
  // Categorize and sum values
  schemes.forEach(scheme => {
    const category = categorizeScheme(scheme.scheme_name)
    allocation[category.category].value += scheme.current_value
    allocation[category.category].count += 1
  })
  
  // Calculate total and percentages
  const total = Object.values(allocation).reduce((sum, cat) => sum + cat.value, 0)
  
  return ASSET_CATEGORIES.map(cat => {
    const data = allocation[cat.category]
    return {
      category: cat.category,
      value: data.value,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
      color: cat.color,
      count: data.count
    }
  }).filter(item => item.value > 0) // Only return categories with values
}

/**
 * Get color for a specific category
 */
export function getCategoryColor(category: string): string {
  const found = ASSET_CATEGORIES.find(cat => cat.category === category)
  return found ? found.color : '#6b7280' // Default gray
}

/**
 * Generate sample data for testing charts
 */
export function generateSampleAllocationData() {
  return [
    { category: 'Equity', value: 150000, percentage: 60, color: '#3b82f6' },
    { category: 'Debt', value: 75000, percentage: 30, color: '#10b981' },
    { category: 'Hybrid', value: 25000, percentage: 10, color: '#f59e0b' }
  ]
}

/**
 * Generate sample growth data for testing charts
 */
export function generateSampleGrowthData() {
  const baseDate = new Date('2023-01-01')
  const data = []
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(baseDate)
    date.setMonth(date.getMonth() + i)
    
    const invested = 100000 + (i * 10000) // Monthly SIP of 10k
    const value = invested * (1 + (i * 0.02)) // 2% monthly growth
    
    data.push({
      date: date.toISOString().slice(0, 10),
      value: Math.round(value),
      invested: invested
    })
  }
  
  return data
} 