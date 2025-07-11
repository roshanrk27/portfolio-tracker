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

/**
 * Format a number in Indian notation with L/Cr suffix
 * @param n - The number to format
 * @returns Formatted string (e.g., ₹1.5L, ₹2.5Cr)
 */
export function formatIndianNumberWithSuffix(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs < 1e5) {
    // Less than 1 lakh
    return `₹${n.toLocaleString('en-IN')}`
  } else if (abs < 1e7) {
    // 1 lakh to less than 1 crore
    return `₹${(n / 1e5).toFixed(abs >= 1e6 ? 2 : 1).replace(/\.0+$/, '')}L`
  } else {
    // 1 crore and above
    return `₹${(n / 1e7).toFixed(2).replace(/\.0+$/, '')}Cr`
  }
}

/**
 * Format duration from months to "Xyr Ym" format
 * @param months - Number of months
 * @returns Formatted string (e.g., "2yr 1m", "1yr", "6m")
 */
export function formatDuration(months: number): string {
  if (months === 0) return '0m'
  
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  
  if (years === 0) {
    return `${remainingMonths}m`
  } else if (remainingMonths === 0) {
    return `${years}yr`
  } else {
    return `${years}yr ${remainingMonths}m`
  }
} 

/**
 * Calculate required monthly SIP to reach target amount
 * Uses iterative approach to find the exact monthly investment needed
 * Formula: P = FV / [((1 + r)^n - 1) / r * (1 + r)]
 * Where:
 * - FV = Target amount (adjusted for existing corpus growth)
 * - r = Monthly interest rate (annual rate / 12)
 * - n = Number of months
 * - P = Required monthly SIP
 * Supports existing corpus that grows alongside new investments
 */
export function calculateRequiredMonthlySIP(
  targetAmount: number,
  months: number,
  xirrPercent: number,
  existingCorpus: number = 0,
  stepUpPercent: number = 0
): { monthlySIP: number; totalInvested: number; finalCorpus: number } {
  try {
    // Validate inputs
    if (targetAmount <= 0 || months <= 0 || xirrPercent < 0) {
      return { monthlySIP: 0, totalInvested: 0, finalCorpus: 0 }
    }

    // Convert annual XIRR percentage to monthly rate
    const monthlyRate = xirrPercent / 100 / 12
    const stepUpRate = stepUpPercent / 100

    // Handle edge case where rate is 0
    if (monthlyRate === 0) {
      const futureValueOfExisting = existingCorpus
      const remainingTarget = targetAmount - futureValueOfExisting
      const requiredMonthlySIP = Math.ceil(remainingTarget / months)
      return {
        monthlySIP: requiredMonthlySIP,
        totalInvested: requiredMonthlySIP * months,
        finalCorpus: targetAmount
      }
    }

    // Calculate future value of existing corpus
    const futureValueOfExisting = existingCorpus * Math.pow(1 + monthlyRate, months)
    const remainingTarget = targetAmount - futureValueOfExisting

    // If existing corpus is sufficient, no additional SIP needed
    if (remainingTarget <= 0) {
      return {
        monthlySIP: 0,
        totalInvested: 0,
        finalCorpus: futureValueOfExisting
      }
    }

    // For step-up calculations, we need to use iterative approach
    if (stepUpPercent > 0) {
      return calculateRequiredSIPWithStepUp(
        remainingTarget,
        months,
        monthlyRate,
        stepUpRate
      )
    }

    // For no step-up, use direct formula
    // Formula: P = FV / [((1 + r)^n - 1) / r * (1 + r)]
    const ratePlusOne = 1 + monthlyRate
    const rateToPowerN = Math.pow(ratePlusOne, months)
    const numerator = rateToPowerN - 1
    const denominator = monthlyRate
    const sipFactor = numerator / denominator
    const totalFactor = sipFactor * ratePlusOne

    const requiredMonthlySIP = Math.ceil(remainingTarget / totalFactor)
    const totalInvested = requiredMonthlySIP * months

    // Verify the calculation - return only the remaining target amount
    const verification = calculateCorpus(requiredMonthlySIP, xirrPercent, months)
    const finalCorpus = verification // Only the SIP corpus, not adding existing corpus

    return {
      monthlySIP: requiredMonthlySIP,
      totalInvested,
      finalCorpus
    }
  } catch (error) {
    console.error('Error in calculateRequiredMonthlySIP:', error)
    return { monthlySIP: 0, totalInvested: 0, finalCorpus: 0 }
  }
}

/**
 * Calculate required monthly SIP with step-up using iterative approach
 * This is more complex because step-up affects the calculation
 */
function calculateRequiredSIPWithStepUp(
  targetAmount: number,
  months: number,
  monthlyRate: number,
  stepUpRate: number
): { monthlySIP: number; totalInvested: number; finalCorpus: number } {
  // Use binary search to find the required monthly SIP
  let low = 0
  let high = targetAmount // Upper bound
  let bestSIP = 0
  let bestCorpus = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    
    // Calculate corpus with this monthly SIP
    const result = calculateCorpusWithStepUp(
      mid,
      monthlyRate * 12 * 100, // Convert back to percentage
      stepUpRate * 100, // Convert back to percentage
      undefined,
      months,
      0 // No existing corpus for this calculation
    )

    if (result.corpus >= targetAmount) {
      // This SIP is sufficient, try a lower value
      bestSIP = mid
      bestCorpus = result.corpus
      high = mid - 1
    } else {
      // This SIP is insufficient, try a higher value
      low = mid + 1
    }
  }

  // Calculate total invested with step-up
  let totalInvested = 0
  let currentSIP = bestSIP
  
  for (let m = 0; m < months; m++) {
    if (m > 0 && m % 12 === 0) {
      currentSIP *= (1 + stepUpRate)
    }
    totalInvested += currentSIP
  }

  return {
    monthlySIP: bestSIP,
    totalInvested: Math.round(totalInvested),
    finalCorpus: bestCorpus
  }
} 

/**
 * Generate multiple step-up scenarios for comparison
 * Shows required monthly SIP for different step-up rates
 * Creates dynamic columns based on duration
 */
export function generateStepUpScenarios(
  targetAmount: number,
  months: number,
  xirrPercent: number,
  existingCorpus: number = 0,
  stepUpRates: number[] = [0, 5, 10, 15, 20]
): Array<{
  stepUpPercent: number
  monthlySIP: number
  totalInvested: number
  finalCorpus: number
  yearColumns: Array<{ year: number; sip: number }>
}> {
  const scenarios = []
  const years = Math.ceil(months / 12)

  // Determine which years to show based on duration
  const getYearColumns = (durationYears: number): number[] => {
    if (durationYears <= 3) {
      // Short goals: show each year
      return Array.from({ length: durationYears }, (_, i) => i + 1)
    } else if (durationYears <= 7) {
      // Medium goals: show key milestones
      return [1, 2, 3, Math.ceil(durationYears / 2), durationYears]
    } else if (durationYears <= 15) {
      // Long goals: show strategic points
      return [1, 3, 5, 7, 10, durationYears]
    } else {
      // Very long goals: show extended milestones
      return [1, 3, 5, 7, 10, 15, durationYears]
    }
  }

  const yearColumns = getYearColumns(years)

  for (const stepUpRate of stepUpRates) {
    const result = calculateRequiredMonthlySIP(
      targetAmount,
      months,
      xirrPercent,
      existingCorpus,
      stepUpRate
    )

    // Calculate SIP amounts for each relevant year
    const yearSIPs = yearColumns.map(year => {
      let sip = result.monthlySIP
      if (stepUpRate > 0 && year > 1) {
        sip = Math.round(result.monthlySIP * Math.pow(1 + stepUpRate / 100, year - 1))
      }
      return { year, sip }
    })

    scenarios.push({
      stepUpPercent: stepUpRate,
      monthlySIP: result.monthlySIP,
      totalInvested: result.totalInvested,
      finalCorpus: result.finalCorpus,
      yearColumns: yearSIPs
    })
  }

  return scenarios
} 