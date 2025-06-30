/**
 * XIRR (Extended Internal Rate of Return) calculation
 * Uses Newton-Raphson method to find the rate that makes NPV = 0
 */

interface CashFlow {
  date: Date
  amount: number
}

interface XIRRResult {
  xirr: number
  iterations: number
  converged: boolean
  error?: string
}

/**
 * Calculate XIRR using Newton-Raphson method
 * @param cashFlows Array of cash flows with dates and amounts
 * @param guess Initial guess for the rate (default: 0.1 = 10%)
 * @param maxIterations Maximum iterations (default: 100)
 * @param tolerance Convergence tolerance (default: 1e-6)
 * @returns XIRR result with rate, iterations, and convergence status
 */
export function calculateXIRR(
  cashFlows: CashFlow[],
  guess: number = 0.1,
  maxIterations: number = 100,
  tolerance: number = 1e-6
): XIRRResult {
  try {
    // Validate inputs
    if (cashFlows.length < 2) {
      return {
        xirr: 0,
        iterations: 0,
        converged: false,
        error: 'At least 2 cash flows required for XIRR calculation'
      }
    }

    // Sort cash flows by date
    const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime())
    
    // Check if we have both positive and negative cash flows
    const hasPositive = sortedFlows.some(cf => cf.amount > 0)
    const hasNegative = sortedFlows.some(cf => cf.amount < 0)
    
    if (!hasPositive || !hasNegative) {
      return {
        xirr: 0,
        iterations: 0,
        converged: false,
        error: 'XIRR requires both positive and negative cash flows'
      }
    }

    let rate = guess
    let iterations = 0

    while (iterations < maxIterations) {
      const { npv, derivative } = calculateNPVAndDerivative(sortedFlows, rate)
      
      // Check for convergence
      if (Math.abs(npv) < tolerance) {
        return {
          xirr: rate,
          iterations: iterations + 1,
          converged: true
        }
      }

      // Newton-Raphson step
      if (Math.abs(derivative) < 1e-10) {
        return {
          xirr: 0,
          iterations: iterations + 1,
          converged: false,
          error: 'Derivative too small, cannot converge'
        }
      }

      const newRate = rate - npv / derivative
      
      // Check for rate bounds (prevent extreme values)
      if (newRate < -0.99 || newRate > 10) {
        return {
          xirr: 0,
          iterations: iterations + 1,
          converged: false,
          error: 'Rate out of reasonable bounds'
        }
      }

      rate = newRate
      iterations++
    }

    return {
      xirr: rate,
      iterations,
      converged: false,
      error: 'Maximum iterations reached without convergence'
    }
  } catch (error) {
    return {
      xirr: 0,
      iterations: 0,
      converged: false,
      error: `Calculation error: ${error}`
    }
  }
}

/**
 * Calculate NPV and its derivative for Newton-Raphson method
 */
function calculateNPVAndDerivative(cashFlows: CashFlow[], rate: number): { npv: number; derivative: number } {
  const baseDate = cashFlows[0].date.getTime()
  let npv = 0
  let derivative = 0

  for (const flow of cashFlows) {
    const daysDiff = (flow.date.getTime() - baseDate) / (1000 * 60 * 60 * 24)
    const yearsDiff = daysDiff / 365.25
    
    const factor = Math.pow(1 + rate, yearsDiff)
    const discountedValue = flow.amount / factor
    
    npv += discountedValue
    
    // Derivative of NPV with respect to rate
    if (yearsDiff !== 0) {
      derivative -= (flow.amount * yearsDiff) / (factor * (1 + rate))
    }
  }

  return { npv, derivative }
}

/**
 * Convert XIRR rate to percentage
 */
export function xirrToPercentage(xirr: number): number {
  return (xirr * 100)
}

/**
 * Format XIRR for display
 */
export function formatXIRR(xirr: number): string {
  const percentage = xirrToPercentage(xirr)
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
}

/**
 * Calculate XIRR for a portfolio (overall)
 */
export function calculatePortfolioXIRR(
  transactions: Array<{ date: string; amount: number; type: string }>,
  currentValue: number,
  currentDate: Date = new Date()
): XIRRResult {
  const cashFlows: CashFlow[] = []

  // Add all transactions (multiply by -1 to make them negative cash flows)
  for (const tx of transactions) {
    cashFlows.push({
      date: new Date(tx.date),
      amount: -tx.amount // Multiply by -1 to make all transactions negative
    })
  }

  // Add current value as final cash flow (positive)
  cashFlows.push({
    date: currentDate,
    amount: currentValue
  })

  return calculateXIRR(cashFlows)
}

/**
 * Calculate XIRR for a specific folio + scheme combination
 */
export function calculateSchemeXIRR(
  transactions: Array<{ date: string; amount: number; type: string }>,
  currentValue: number,
  currentDate: Date = new Date()
): XIRRResult {
  return calculatePortfolioXIRR(transactions, currentValue, currentDate)
}

/**
 * Calculate XIRR for a goal (combination of mapped schemes)
 */
export function calculateGoalXIRR(
  goalMappings: Array<{ scheme_name: string; folio: string }>,
  schemeTransactions: Record<string, Array<{ date: string; amount: number; type: string }>>,
  schemeCurrentValues: Record<string, number>,
  currentDate: Date = new Date()
): XIRRResult {
  const allCashFlows: CashFlow[] = []

  // Collect all cash flows from mapped schemes
  for (const mapping of goalMappings) {
    const key = `${mapping.scheme_name}-${mapping.folio}`
    const transactions = schemeTransactions[key] || []
    const currentValue = schemeCurrentValues[key] || 0

    // Add transactions for this scheme (multiply by -1 to make them negative)
    for (const tx of transactions) {
      allCashFlows.push({
        date: new Date(tx.date),
        amount: -tx.amount // Multiply by -1 to make all transactions negative
      })
    }

    // Add current value for this scheme (positive)
    if (currentValue > 0) {
      allCashFlows.push({
        date: currentDate,
        amount: currentValue
      })
    }
  }

  return calculateXIRR(allCashFlows)
} 