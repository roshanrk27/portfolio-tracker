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
 * - FV = Target amount (adjusted for existing corpus)
 * - P = Monthly SIP amount
 * - r = Monthly interest rate (annual rate / 12)
 * - n = Number of months
 * Accounts for existing corpus that grows alongside SIP investments
 */
export function calculateMonthsToTarget(
  targetAmount: number,
  monthlySIP: number,
  xirrPercent: number,
  existingCorpus: number = 0
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
      const remainingTarget = targetAmount - existingCorpus
      return Math.ceil(remainingTarget / monthlySIP)
    }

    // Calculate using inverse SIP formula: n = log((FV * r / P) + 1) / log(1 + r)
    // First, we need to account for existing corpus growth
    // The equation becomes: targetAmount = existingCorpus * (1 + r)^n + SIP * [((1 + r)^n - 1) / r] * (1 + r)
    // Solving for n requires iterative approach since existing corpus growth affects the calculation
    
    // For simplicity and accuracy, we'll use an iterative approach
    let months = 0
    const maxMonths = 600 // 50 years max
    
    while (months < maxMonths) {
      // Calculate what the corpus would be after 'months' months
      const futureValueOfExisting = existingCorpus * Math.pow(1 + monthlyRate, months)
      const sipCorpus = monthlySIP * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate)
      const totalCorpus = futureValueOfExisting + sipCorpus
      
      if (totalCorpus >= targetAmount) {
        return months
      }
      
      months++
    }
    
    return maxMonths // Return max months if target cannot be reached
  } catch (error) {
    console.error('Error in calculateMonthsToTarget:', error)
    return 0
  }
}

/**
 * Calculate corpus with yearly step-up SIP
 * Simulates year-by-year SIP increment with monthly compounding
 * Can return either final corpus (if months given) or months to reach target
 * Supports existing corpus that grows alongside new SIP investments
 */
export function calculateCorpusWithStepUp(
  monthlySIP: number,
  xirrPercent: number,
  stepUpPercent: number,
  targetAmount?: number,
  months?: number,
  existingCorpus: number = 0
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
        const remainingTarget = targetAmount - existingCorpus
        const totalMonths = Math.ceil(remainingTarget / monthlySIP)
        return { corpus: targetAmount, months: totalMonths }
      } else if (months) {
        // Calculate corpus without interest
        let totalCorpus = existingCorpus
        let currentSIP = monthlySIP
        
        for (let year = 0; year < Math.ceil(months / 12); year++) {
          const monthsThisYear = Math.min(12, months - year * 12)
          totalCorpus += currentSIP * monthsThisYear
          currentSIP *= (1 + stepUpRate)
        }
        
        return { corpus: totalCorpus, months }
      }
      return { corpus: existingCorpus, months: 0 }
    }

    let totalCorpus = existingCorpus
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

/**
 * Inflation adjustment utilities for goal simulation
 * Uses 6% annual inflation rate for real value calculations
 */

/**
 * Adjust a nominal value for inflation over a given time period
 * @param nominalValue - The nominal (future) value
 * @param months - Number of months from now
 * @param inflationRate - Annual inflation rate (default 6%)
 * @returns Real value in today's purchasing power
 */
export function adjustForInflation(
  nominalValue: number, 
  months: number, 
  inflationRate: number = 6
): number {
  try {
    if (nominalValue <= 0 || months < 0 || inflationRate < 0) {
      return nominalValue
    }
    
    const years = months / 12
    const inflationFactor = Math.pow(1 + inflationRate / 100, years)
    return Math.round((nominalValue / inflationFactor) * 100) / 100
  } catch (error) {
    console.error('Error in adjustForInflation:', error)
    return nominalValue
  }
}

/**
 * Calculate the inflation-adjusted value for a given time period
 * @param currentValue - Current value
 * @param monthsFromNow - Months from now
 * @param inflationRate - Annual inflation rate (default 6%)
 * @returns Inflation-adjusted value
 */
export function getInflationAdjustedValue(
  currentValue: number, 
  monthsFromNow: number, 
  inflationRate: number = 6
): number {
  return adjustForInflation(currentValue, monthsFromNow, inflationRate)
}

/**
 * Calculate the nominal value needed to maintain purchasing power
 * @param realValue - Real value in today's terms
 * @param months - Number of months from now
 * @param inflationRate - Annual inflation rate (default 6%)
 * @returns Nominal value needed
 */
export function calculateNominalValue(
  realValue: number, 
  months: number, 
  inflationRate: number = 6
): number {
  try {
    if (realValue <= 0 || months < 0 || inflationRate < 0) {
      return realValue
    }
    
    const years = months / 12
    const inflationFactor = Math.pow(1 + inflationRate / 100, years)
    return Math.round((realValue * inflationFactor) * 100) / 100
  } catch (error) {
    console.error('Error in calculateNominalValue:', error)
    return realValue
  }
} 