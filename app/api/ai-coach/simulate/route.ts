/**
 * POST /api/ai-coach/simulate
 * Calculate required SIP and generate step-up scenarios
 */

import { validateAICoachRequest } from '@/lib/ai-coach-api/auth'
import {
  successResponse,
  errorResponse,
  formatCurrency,
  formatMonthsToReadable,
  formatScenarioDescription,
  calculateScenarioRating,
  formatPercentage
} from '@/lib/ai-coach-api/helpers'
import type { SimulationResponse } from '@/lib/ai-coach-api/types'
import { calculateRequiredMonthlySIP, generateStepUpScenarios } from '@/lib/goalSimulator'
import { z } from 'zod'
import { NextRequest } from 'next/server'

// Validation schema
const simulationSchema = z.object({
  goalId: z.string().uuid().optional(),
  targetAmount: z.number().positive(),
  months: z.number().int().positive(),
  xirrPercent: z.number().min(0),
  existingCorpus: z.number().min(0).default(0),
  stepUpPercent: z.number().min(0).default(0),
  includeScenarios: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const authError = validateAICoachRequest(request.headers)
    if (authError) return authError

    // Parse and validate request body
    const body = await request.json()
    const validationResult = simulationSchema.safeParse(body)

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        400
      )
    }

    const {
      goalId,
      targetAmount,
      months,
      xirrPercent,
      existingCorpus = 0,
      stepUpPercent = 0,
      includeScenarios = true
    } = validationResult.data

    // Calculate base required SIP
    const baseCalculation = calculateRequiredMonthlySIP(
      targetAmount,
      months,
      xirrPercent,
      existingCorpus,
      stepUpPercent
    )

    if (baseCalculation.monthlySIP === 0 && baseCalculation.totalInvested === 0) {
      return successResponse<SimulationResponse>(
        {
          input: {
            goalId,
            targetAmount,
            targetAmount_formatted: formatCurrency(targetAmount),
            months,
            months_formatted: formatMonthsToReadable(months),
            xirrPercent,
            existingCorpus,
            existingCorpus_formatted: formatCurrency(existingCorpus),
            stepUpPercent,
            includeScenarios
          },
          base_calculation: {
            requiredMonthlySIP: 0,
            requiredMonthlySIP_formatted: '₹0/month',
            totalInvested: 0,
            totalInvested_formatted: formatCurrency(0),
            finalCorpus: baseCalculation.finalCorpus,
            finalCorpus_formatted: formatCurrency(baseCalculation.finalCorpus),
            investment_description: 'Existing corpus is sufficient to meet target'
          },
          scenarios: [],
          _action_items: ['Review investment strategy', 'Consider increasing target amount']
        },
        'Existing corpus is already sufficient to meet the target amount. No additional SIP needed.'
      )
    }

    // Generate scenarios if requested
    let scenarios = undefined
    let bestScenario = undefined
    let comparisonSummary = undefined
    let actionItems: string[] = []

    if (includeScenarios) {
      const stepUpRates = [0, 5, 10, 15, 20]
      const rawScenarios = generateStepUpScenarios(
        targetAmount,
        months,
        xirrPercent,
        existingCorpus,
        stepUpRates
      )

      scenarios = rawScenarios.map((scenario) => {
        const savings = scenario.totalInvested < baseCalculation.totalInvested
          ? baseCalculation.totalInvested - scenario.totalInvested
          : 0

        return {
          stepUpPercent: scenario.stepUpPercent,
          stepUpPercent_formatted: `${scenario.stepUpPercent}% yearly`,
          monthlySIP: scenario.monthlySIP,
          monthlySIP_formatted: `₹${scenario.monthlySIP.toLocaleString('en-IN')}/month`,
          totalInvested: scenario.totalInvested,
          totalInvested_formatted: formatCurrency(scenario.totalInvested),
          finalCorpus: scenario.finalCorpus,
          finalCorpus_formatted: formatCurrency(scenario.finalCorpus),
          scenario_description: formatScenarioDescription(
            scenario.stepUpPercent,
            scenario.monthlySIP,
            `₹${scenario.monthlySIP.toLocaleString('en-IN')}/month`
          ),
          savings_vs_baseline: savings > 0 ? `Save ${formatCurrency(savings)} vs fixed SIP` : undefined,
          recommendation_score: calculateScenarioRating(scenario.stepUpPercent, scenario.monthlySIP, rawScenarios),
          yearColumns: scenario.yearColumns.map(yc => ({
            year: yc.year,
            sip: yc.sip,
            sip_formatted: `₹${yc.sip.toLocaleString('en-IN')}`
          }))
        }
      })

      // Find best scenario (highest recommendation score)
      if (scenarios.length > 0) {
        const best = scenarios.reduce((max, s) => s.recommendation_score > max.recommendation_score ? s : max)
        bestScenario = {
          stepUpPercent: best.stepUpPercent,
          reasoning: best.stepUpPercent === 0
            ? 'Fixed SIP is the simplest approach with predictable monthly commitment'
            : `${best.stepUpPercent}% yearly step-up balances affordability with long-term wealth building. Start lower and increase as income grows.`
        }

        // Generate comparison summary
        const fixedSIP = scenarios.find(s => s.stepUpPercent === 0)
        const recommendedSIP = scenarios.find(s => s.stepUpPercent === best.stepUpPercent)
        if (fixedSIP && recommendedSIP && fixedSIP.monthlySIP !== recommendedSIP.monthlySIP) {
          const savings = fixedSIP.totalInvested - recommendedSIP.totalInvested
          comparisonSummary = `Fixed SIP requires ${fixedSIP.monthlySIP_formatted} monthly. With ${recommendedSIP.stepUpPercent_formatted} step-up, start at ${recommendedSIP.monthlySIP_formatted} and save ${formatCurrency(savings)} overall.`
        }

        // Generate action items (using best scenario)
        if (recommendedSIP) {
          actionItems = [
            `Start with SIP of ${recommendedSIP.monthlySIP_formatted}`,
            recommendedSIP.stepUpPercent > 0 ? `Increase by ${recommendedSIP.stepUpPercent_formatted} every year` : '',
            'Review annually and adjust based on goal progress'
          ].filter(item => item !== '')
        } else {
          // Fallback if recommendedSIP not found
          actionItems = [
            'Review investment strategy',
            'Consider step-up SIP for better affordability'
          ]
        }
      }
    }

    const response: SimulationResponse = {
      input: {
        goalId,
        targetAmount,
        targetAmount_formatted: formatCurrency(targetAmount),
        months,
        months_formatted: formatMonthsToReadable(months),
        xirrPercent,
        existingCorpus,
        existingCorpus_formatted: formatCurrency(existingCorpus),
        stepUpPercent,
        includeScenarios
      },
      base_calculation: {
        requiredMonthlySIP: baseCalculation.monthlySIP,
        requiredMonthlySIP_formatted: `₹${baseCalculation.monthlySIP.toLocaleString('en-IN')}/month`,
        totalInvested: baseCalculation.totalInvested,
        totalInvested_formatted: formatCurrency(baseCalculation.totalInvested),
        finalCorpus: baseCalculation.finalCorpus,
        finalCorpus_formatted: formatCurrency(baseCalculation.finalCorpus),
        investment_description: `Invest ₹${baseCalculation.monthlySIP.toLocaleString('en-IN')}/month for ${formatMonthsToReadable(months)} at ${formatPercentage(xirrPercent / 100)} XIRR`
      },
      scenarios,
      best_scenario: bestScenario,
      comparison_summary: comparisonSummary,
      _action_items: actionItems.length > 0 ? actionItems : undefined
    }

    // Generate summary
    let summary = `To reach ${formatCurrency(targetAmount)} in ${formatMonthsToReadable(months)} at ${formatPercentage(xirrPercent / 100)}, need ${formatCurrency(baseCalculation.monthlySIP).replace('₹', '₹')}/month`
    
    if (bestScenario && scenarios && scenarios.length > 1) {
      const best = scenarios.find(s => s.stepUpPercent === bestScenario.stepUpPercent)
      if (best && best.stepUpPercent > 0) {
        summary += `. With ${best.stepUpPercent_formatted} step-up, start at ${best.monthlySIP_formatted}, saving ${best.savings_vs_baseline || ''} overall`
      }
    }

    return successResponse(response, summary)

  } catch (error) {
    console.error('Error in POST /api/ai-coach/simulate:', error)
    return errorResponse('Internal server error while simulating goal', 500)
  }
}

