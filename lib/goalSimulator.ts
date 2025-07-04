/**
 * Goal Simulation Module
 * Contains functions for calculating SIP projections and goal planning
 */

/**
 * Calculate final corpus for a SIP investment without step-up
 * Formula: FV = P * [((1 + r)^n - 1) / r] * (1 + r)
 * Where:
 * - P = Monthly SIP amount
 * - r = Monthly interest rate (annual rate / 12)
 * - n = Number of months
 * - FV = Future Value (final corpus)
 */
export function calculateCorpus(
  monthlySIP: number,
  xirrPercent: number,
  months: number
): number {
  try {
    // Validate inputs
    if (monthlySIP <= 0 || xirrPercent < 0 || months <= 0) {
      return 0
    }

    // Convert annual XIRR percentage to monthly rate
    const monthlyRate = xirrPercent / 100 / 12

    // Handle edge case where rate is 0
    if (monthlyRate === 0) {
      return monthlySIP * months
    }

    // Calculate using SIP formula: FV = P * [((1 + r)^n - 1) / r] * (1 + r)
    const ratePlusOne = 1 + monthlyRate
    const rateToPowerN = Math.pow(ratePlusOne, months)
    const numerator = rateToPowerN - 1
    const denominator = monthlyRate
    const sipFactor = numerator / denominator
    const finalCorpus = monthlySIP * sipFactor * ratePlusOne

    return Math.round(finalCorpus * 100) / 100 // Round to 2 decimal places
  } catch (error) {
    console.error('Error in calculateCorpus:', error)
    return 0
  }
}

/**
 * Calculate number of months needed to reach target amount
 * Uses inverse of SIP formula: n = log((FV * r / P) + 1) / log(1 + r)
 * Where:
 * - FV = Target amount
 * - P = Monthly SIP amount
 * - r = Monthly interest rate (annual rate / 12)
 * - n = Number of months
 */
export function calculateMonthsToTarget(
  targetAmount: number,
  monthlySIP: number,
  xirrPercent: number
): number {
  try {
    // Validate inputs
    if (targetAmount <= 0 || monthlySIP <= 0 || xirrPercent < 0) {
      return 0
    }

    // Convert annual XIRR percentage to monthly rate
    const monthlyRate = xirrPercent / 100 / 12

    // Handle edge case where rate is 0
    if (monthlyRate === 0) {
      return Math.ceil(targetAmount / monthlySIP)
    }

    // Calculate using inverse SIP formula: n = log((FV * r / P) + 1) / log(1 + r)
    const ratePlusOne = 1 + monthlyRate
    const targetTimesRate = targetAmount * monthlyRate
    const sipAmount = monthlySIP
    const logArgument = (targetTimesRate / sipAmount) + 1
    
    // Check if log argument is valid (must be positive)
    if (logArgument <= 0) {
      return 0
    }

    const months = Math.log(logArgument) / Math.log(ratePlusOne)

    // Return ceiling of months (round up to ensure target is reached)
    return Math.ceil(months)
  } catch (error) {
    console.error('Error in calculateMonthsToTarget:', error)
    return 0
  }
}

/**
 * Calculate corpus with yearly step-up SIP
 * Simulates year-by-year SIP increment with monthly compounding
 * Can return either final corpus (if months given) or months to reach target
 */
export function calculateCorpusWithStepUp(
  monthlySIP: number,
  xirrPercent: number,
  stepUpPercent: number,
  targetAmount?: number,
  months?: number
): { corpus: number; months: number } {
  try {
    // Validate inputs
    if (monthlySIP <= 0 || xirrPercent < 0 || stepUpPercent < 0) {
      return { corpus: 0, months: 0 }
    }

    // Convert annual XIRR percentage to monthly rate
    const monthlyRate = xirrPercent / 100 / 12
    const stepUpRate = stepUpPercent / 100

    // Handle edge case where rate is 0
    if (monthlyRate === 0) {
      if (targetAmount && !months) {
        // Calculate months needed without interest
        const totalMonths = Math.ceil(targetAmount / monthlySIP)
        return { corpus: targetAmount, months: totalMonths }
      } else if (months) {
        // Calculate corpus without interest
        let totalCorpus = 0
        let currentSIP = monthlySIP
        
        for (let year = 0; year < Math.ceil(months / 12); year++) {
          const monthsThisYear = Math.min(12, months - year * 12)
          totalCorpus += currentSIP * monthsThisYear
          currentSIP *= (1 + stepUpRate)
        }
        
        return { corpus: totalCorpus, months }
      }
      return { corpus: 0, months: 0 }
    }

    let totalCorpus = 0
    let currentSIP = monthlySIP
    let currentMonth = 0
    let targetReached = false
    let monthsToTarget = 0

    // Simulate month by month with yearly step-up
    while (true) {
      const year = Math.floor(currentMonth / 12)
      const monthInYear = currentMonth % 12
      
      // Apply step-up at the beginning of each year (except first year)
      if (monthInYear === 0 && year > 0) {
        currentSIP *= (1 + stepUpRate)
      }

      // Compound the current corpus
      totalCorpus *= (1 + monthlyRate)
      
      // Add the monthly SIP
      totalCorpus += currentSIP
      
      currentMonth++

      // Check if we've reached the target
      if (targetAmount && totalCorpus >= targetAmount && !targetReached) {
        monthsToTarget = currentMonth
        targetReached = true
      }

      // Stop conditions
      if (months && currentMonth >= months) {
        break
      }
      
      // If we have a target and we've reached it, we can stop
      if (targetAmount && targetReached && !months) {
        break
      }
      
      // Safety check to prevent infinite loops
      if (currentMonth > 600) { // 50 years max
        break
      }
    }

    return {
      corpus: Math.round(totalCorpus * 100) / 100,
      months: targetAmount ? monthsToTarget : (months || currentMonth)
    }
  } catch (error) {
    console.error('Error in calculateCorpusWithStepUp:', error)
    return { corpus: 0, months: 0 }
  }
} 