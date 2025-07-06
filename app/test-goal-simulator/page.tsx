'use client'

import { useState } from 'react'
import { calculateCorpusWithStepUp, calculateMonthsToTarget } from '@/lib/goalSimulator'

export default function TestGoalSimulator() {
  const [monthlySIP, setMonthlySIP] = useState(10000)
  const [xirrPercent, setXirrPercent] = useState(12)
  const [stepUpPercent, setStepUpPercent] = useState(10)
  const [targetAmount, setTargetAmount] = useState(5000000)
  const [existingCorpus, setExistingCorpus] = useState(100000)
  const [months, setMonths] = useState(60)

  // Test Task 1: calculateCorpusWithStepUp with existing corpus
  const testTask1 = () => {
    const result = calculateCorpusWithStepUp(
      monthlySIP,
      xirrPercent,
      stepUpPercent,
      undefined, // no target
      months,
      existingCorpus
    )
    return result
  }

  // Test Task 2: calculateMonthsToTarget with existing corpus
  const testTask2 = () => {
    const result = calculateMonthsToTarget(
      targetAmount,
      monthlySIP,
      xirrPercent,
      existingCorpus
    )
    return result
  }

  const task1Result = testTask1()
  const task2Result = testTask2()

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Goal Simulator Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Input Parameters</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Monthly SIP (₹)</label>
            <input
              type="number"
              value={monthlySIP}
              onChange={(e) => setMonthlySIP(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">XIRR (%)</label>
            <input
              type="number"
              value={xirrPercent}
              onChange={(e) => setXirrPercent(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Step-up (%)</label>
            <input
              type="number"
              value={stepUpPercent}
              onChange={(e) => setStepUpPercent(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Existing Corpus (₹)</label>
            <input
              type="number"
              value={existingCorpus}
              onChange={(e) => setExistingCorpus(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Target Amount (₹)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Months</label>
            <input
              type="number"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-2 text-blue-900">Task 1: calculateCorpusWithStepUp</h3>
            <p className="text-sm text-blue-700 mb-2">
              Calculate final corpus with existing corpus support
            </p>
            <div className="space-y-1 text-blue-800">
              <p><strong>Input:</strong> SIP: ₹{monthlySIP.toLocaleString()}, XIRR: {xirrPercent}%, Step-up: {stepUpPercent}%, Existing: ₹{existingCorpus.toLocaleString()}, Months: {months}</p>
              <p><strong>Output:</strong> Corpus: ₹{task1Result.corpus.toLocaleString()}, Months: {task1Result.months}</p>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold mb-2 text-green-900">Task 2: calculateMonthsToTarget</h3>
            <p className="text-sm text-green-700 mb-2">
              Calculate months needed to reach target with existing corpus
            </p>
            <div className="space-y-1 text-green-800">
              <p><strong>Input:</strong> Target: ₹{targetAmount.toLocaleString()}, SIP: ₹{monthlySIP.toLocaleString()}, XIRR: {xirrPercent}%, Existing: ₹{existingCorpus.toLocaleString()}</p>
              <p><strong>Output:</strong> Months needed: {task2Result}</p>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold mb-2 text-yellow-900">Comparison Tests</h3>
            <div className="space-y-2 text-sm text-yellow-800">
              <p><strong>Without existing corpus:</strong></p>
              <p>• Corpus: ₹{calculateCorpusWithStepUp(monthlySIP, xirrPercent, stepUpPercent, undefined, months, 0).corpus.toLocaleString()}</p>
              <p>• Months to target: {calculateMonthsToTarget(targetAmount, monthlySIP, xirrPercent, 0)}</p>
              
              <p className="mt-2"><strong>With existing corpus:</strong></p>
              <p>• Corpus: ₹{task1Result.corpus.toLocaleString()}</p>
              <p>• Months to target: {task2Result}</p>
              
              <p className="mt-2"><strong>Difference:</strong></p>
              <p>• Corpus difference: ₹{(task1Result.corpus - calculateCorpusWithStepUp(monthlySIP, xirrPercent, stepUpPercent, undefined, months, 0).corpus).toLocaleString()}</p>
              <p>• Months difference: {calculateMonthsToTarget(targetAmount, monthlySIP, xirrPercent, 0) - task2Result}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              setMonthlySIP(10000)
              setXirrPercent(12)
              setStepUpPercent(10)
              setExistingCorpus(100000)
              setTargetAmount(5000000)
              setMonths(60)
            }}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Scenario 1: Basic
          </button>
          
          <button
            onClick={() => {
              setMonthlySIP(50000)
              setXirrPercent(15)
              setStepUpPercent(20)
              setExistingCorpus(500000)
              setTargetAmount(10000000)
              setMonths(120)
            }}
            className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Scenario 2: High SIP
          </button>
          
          <button
            onClick={() => {
              setMonthlySIP(5000)
              setXirrPercent(8)
              setStepUpPercent(5)
              setExistingCorpus(2000000)
              setTargetAmount(3000000)
              setMonths(36)
            }}
            className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Scenario 3: Large Existing
          </button>
        </div>
      </div>
    </div>
  )
} 