# 🧠 Goal Simulation Module – Engineering Task Breakdown

This document outlines a **granular, step-by-step breakdown** for building the goal simulation feature in the Portfolio Tracker. Each task is atomic, testable, and designed to help build incrementally.

---

## 🧱 PHASE 1: Backend Calculation Utilities

### ✅ Task 1: Create a utility to calculate average monthly investment
- **Start**: Add a function `getAverageMonthlyInvestment(userId)` in `lib/portfolioUtils.ts`
- **Logic**: 
  - Query `transactions` for the last 12 months
  - Sum `amount` per month
  - Return average
- **End**: Function returns numeric value

---

### ✅ Task 2: Create a utility to fetch historical XIRR
- **Start**: Add a function `getUserXirr(userId)` in `lib/xirr.ts`
- **Logic**: 
  - Use existing `xirr()` with user’s mutual fund transactions
- **End**: Function returns % XIRR (numeric)

---

### ✅ Task 3: Create a SIP projection calculator (without step-up)
- **Start**: New `lib/goalSimulator.ts`
- **Logic**:
  - Implement FV = P \* [((1 + r)^n - 1) / r] \* (1 + r)
- **End**: Function `calculateCorpus(monthlySIP, xirrPercent, months)` returns final corpus

---

### ✅ Task 4: Add reverse SIP calculator (compute months needed)
- **Start**: Add `calculateMonthsToTarget()` to `goalSimulator.ts`
- **Logic**: 
  - Use inverse of SIP formula
  - Inputs: targetAmount, monthlySIP, xirrPercent
- **End**: Function returns number of months

---

### ✅ Task 5: Extend SIP calculator to support yearly step-up
- **Start**: `calculateCorpusWithStepUp(monthlySIP, xirrPercent, stepUpPercent, targetAmount?)`
- **Logic**: 
  - Simulate year-by-year SIP increment
  - Compound monthly
- **End**: Return either corpus (if months given) or months to reach target

---

## 🧱 PHASE 2: API & Server Actions

### ✅ Task 6: Create a `POST /api/simulate-goal` endpoint
- **Start**: Add file `app/api/simulate-goal/route.ts`
- **Logic**:
  - Accepts: monthlySIP, xirr, stepUp, targetAmount
  - Returns: projection over time (array of date → corpus)
- **End**: JSON array of corpus projections

---

### ✅ Task 7: Add API support for goal-linked simulation
- **Start**: Extend endpoint to accept `goalId`
- **Logic**:
  - Fetch goal info
  - Prefill inputs from DB and allow override
- **End**: Returns pre-filled + simulation-ready data

---

## 🧱 PHASE 3: Frontend Components

### ✅ Task 8: Build `<GoalSimulatorForm />` component
- **Start**: Create component in `components/`
- **Inputs**: 
  - Monthly SIP (editable, prefilled)
  - XIRR% (editable, prefilled)
  - Step-up %
  - Target amount
- **End**: Emits form state on change or submit

---

### ✅ Task 9: Add new route `/goals/simulator`
- **Start**: Create file `app/dashboard/goals/simulator/page.tsx`
- **Logic**: 
  - Render `<GoalSimulatorForm />` with empty goal
- **End**: Page loads, ready to simulate new goals

---

### ✅ Task 10: Add “Simulate Plan” button to goal detail view
- **Start**: In goal detail component
- **Action**: Button triggers navigation to simulator page with goalId
- **End**: Goal details passed via route or query param

---

### ✅ Task 11: Build corpus over time chart
- **Start**: Create `components/GoalProjectionChart.tsx`
- **Type**: Line chart (e.g., using `recharts`)
- **Data**: Date vs Corpus
- **End**: Chart renders based on simulation data

---

### ✅ Task 12: Build Step-up vs Time-to-goal chart
- **Start**: `components/StepUpEffectChart.tsx`
- **Type**: Bar or Line
- **X**: Step-up %
- **Y**: Time (months or goal date)
- **End**: Renders chart on alternate step-up inputs

---

### ✅ Task 13: Build simulation scenario table
- **Start**: `components/SimulationSummaryTable.tsx`
- **Columns**: XIRR, SIP, Step-up, Total Invested, Goal Date, Final Corpus
- **End**: Display key simulation data for comparison

---

## 🧪 PHASE 4: Testing & Iteration

### ✅ Task 14: Add input validation to GoalSimulatorForm
- **Start**: Validate SIP > 0, target > 0, XIRR% within 0–20%
- **End**: Errors shown inline

---

### ✅ Task 15: Write unit tests for `goalSimulator.ts`
- **Start**: Use your existing testing setup
- **Tests**:
  - SIP projection
  - Months to goal
  - Step-up edge cases
- **End**: All tests pass

---

### ✅ Task 16: Write integration test for simulate-goal API
- **Start**: Use Next.js API testing framework
- **Cases**:
  - New goal
  - Existing goal
  - Invalid inputs
- **End**: Test responses validated

---

### ✅ Task 17: Final visual polish + responsiveness
- **Start**: Apply Tailwind styling
- **Check**:
  - Mobile view
  - Dark mode support
- **End**: UI consistent with design system

---

Once all tasks are completed, the simulation feature will support both goal-linked and standalone planning — with robust visuals and backend-calculated accuracy.
