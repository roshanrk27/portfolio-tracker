import { NextRequest, NextResponse } from 'next/server'
import { calculateCorpusWithStepUp } from '@/lib/goalSimulator'
import { getGoalXIRR, getAverageMonthlyInvestmentByGoal, getGoalWithProgress } from '@/lib/portfolioUtils'
import { getUserXirrByGoal } from '@/lib/xirr'

interface SimulationRequest {
  monthlySIP?: number
  xirr?: number
  stepUp?: number
  targetAmount?: number
  months?: number
  goalId?: string
  existingCorpus?: number
}

interface ProjectionPoint {
  date: string
  corpus: number
  months: number
}

export async function POST(request: NextRequest) {
  try {
    const body: SimulationRequest = await request.json()

    // If goalId is provided, fetch goal data and prefill inputs
    const prefilledData = {
      monthlySIP: body.monthlySIP,
      xirr: body.xirr,
      stepUp: body.stepUp || 0,
      targetAmount: body.targetAmount,
      months: body.months,
      existingCorpus: body.existingCorpus || 0
    }

    if (body.goalId) {
      try {
        // Get goal details for target amount
        const goalWithProgress = await getGoalWithProgress(body.goalId)
        if (goalWithProgress) {
          // Prefill target amount from goal
          prefilledData.targetAmount = body.targetAmount ?? goalWithProgress.target_amount
          
          // Prefill existing corpus from current goal value
          prefilledData.existingCorpus = body.existingCorpus ?? goalWithProgress.current_amount
        }

        // Get goal XIRR using the dedicated XIRR utility
        const goalXirr = await getUserXirrByGoal(body.goalId)
        if (goalXirr > 0) {
          prefilledData.xirr = body.xirr ?? goalXirr
        } else {
          // Fallback to the existing getGoalXIRR if getUserXirrByGoal returns 0
          const xirrData = await getGoalXIRR(body.goalId)
          if (xirrData && xirrData.converged) {
            prefilledData.xirr = body.xirr ?? (xirrData.xirrPercentage || 12)
          }
        }

        // Get average monthly investment for this goal
        const avgMonthlyInvestment = await getAverageMonthlyInvestmentByGoal(body.goalId)
        if (avgMonthlyInvestment > 0) {
          prefilledData.monthlySIP = body.monthlySIP ?? avgMonthlyInvestment
        }

        // Note: All values can be overridden by user input
      } catch (error) {
        console.error('Error fetching goal data:', error)
        // Continue with provided values if goal data fetch fails
      }
    }

    // Validate that we have required values (either from goal or user input)
    if (!prefilledData.monthlySIP || prefilledData.monthlySIP <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid monthlySIP. Provide a value or link to a goal with investment history.' },
        { status: 400 }
      )
    }

    if (!prefilledData.xirr || prefilledData.xirr < 0) {
      return NextResponse.json(
        { error: 'Missing or invalid xirr. Provide a value or link to a goal with XIRR data.' },
        { status: 400 }
      )
    }

    // Validate input values
    if (prefilledData.monthlySIP <= 0 || prefilledData.xirr < 0 || prefilledData.stepUp < 0 || prefilledData.existingCorpus < 0) {
      return NextResponse.json(
        { error: 'Invalid input values: all values must be positive' },
        { status: 400 }
      )
    }

    // Determine simulation period
    let simulationMonths = prefilledData.months || 60 // Default to 5 years if not specified

    // If target amount is provided, calculate months needed
    if (prefilledData.targetAmount && !prefilledData.months) {
      const result = calculateCorpusWithStepUp(
        prefilledData.monthlySIP!,
        prefilledData.xirr!,
        prefilledData.stepUp,
        prefilledData.targetAmount,
        undefined,
        prefilledData.existingCorpus
      )
      simulationMonths = result.months
    }

    // Generate projection data
    const projection: ProjectionPoint[] = []
    const startDate = new Date()
    
    // Calculate projection for each year (or shorter intervals for better granularity)
    const intervals = Math.min(simulationMonths, 60) // Max 60 data points
    const intervalMonths = Math.ceil(simulationMonths / intervals)

    // Generate the projection and track the actual months used
    let actualMonths = 0
    for (let i = 0; i <= intervals; i++) {
      const months = Math.min(i * intervalMonths, simulationMonths)
      if (months > actualMonths) actualMonths = months
      if (months === 0) {
        projection.push({
          date: startDate.toISOString().split('T')[0],
          corpus: prefilledData.existingCorpus,
          months: 0
        })
        continue
      }
      const result = calculateCorpusWithStepUp(
        prefilledData.monthlySIP!,
        prefilledData.xirr!,
        prefilledData.stepUp,
        undefined,
        months,
        prefilledData.existingCorpus
      )
      const projectionDate = new Date(startDate)
      projectionDate.setMonth(projectionDate.getMonth() + months)
      projection.push({
        date: projectionDate.toISOString().split('T')[0],
        corpus: result.corpus,
        months: months
      })
    }

    // Calculate total invested (sum of all SIPs, including step-up) for the actual projection period
    let totalInvested = 0
    let currentSIP = prefilledData.monthlySIP!
    const stepUpRate = prefilledData.stepUp ? prefilledData.stepUp / 100 : 0
    for (let m = 0; m < actualMonths; m++) {
      if (m > 0 && m % 12 === 0) {
        currentSIP *= (1 + stepUpRate)
      }
      totalInvested += currentSIP
    }

    return NextResponse.json({
      projection,
      summary: {
        finalCorpus: projection[projection.length - 1]?.corpus || 0,
        totalMonths: simulationMonths,
        monthlySIP: prefilledData.monthlySIP,
        xirr: prefilledData.xirr,
        stepUp: prefilledData.stepUp,
        targetAmount: prefilledData.targetAmount,
        goalId: body.goalId,
        existingCorpus: prefilledData.existingCorpus,
        totalInvested: Math.round(totalInvested)
      }
    })

  } catch (error) {
    console.error('Error in simulate-goal API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 