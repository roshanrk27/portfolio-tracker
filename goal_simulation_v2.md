# 🧠 Goal Simulation Module (v2) – Engineering Task Breakdown

This update enhances the existing goal simulation feature with support for existing corpus and smarter goal selection autofill. Each task below is atomic, testable, and meant to be handed off one-by-one to an engineering LLM.

---

## ✨ New Requirements Summary

1. **Support for Existing Corpus**:
   - Add a new input field: **Existing Corpus**
   - Modify all simulation formulas to include existing corpus as initial value.

2. **Goal Selector & Autofill**:
   - Add dropdown to choose existing user goals (optional)
   - If selected, auto-prefill:
     - Existing Corpus → current value of goal
     - Target Amount → from goal
     - Monthly SIP → avg monthly MF investment mapped to goal
     - XIRR → MF XIRR for that goal
   - All values should remain editable.

---

## 🧱 PHASE 1: Backend Enhancements

### ✅ Task 1: Extend projection formula to account for existing corpus
- **Start**: Update `calculateCorpusWithStepUp()` in `goalSimulator.ts`
- **Logic**: Add compound growth of existingCorpus alongside SIP
- **End**: Function supports an `existingCorpus` param and includes it in growth

---

### ✅ Task 2: Update reverse calculator to account for existing corpus
- **Start**: Update `calculateMonthsToTarget()` logic
- **Logic**: Subtract future value of `existingCorpus` from target before computing months needed
- **End**: Accurate calculation of required SIP duration with corpus included

---

### ✅ Task 3: Add `getGoalXirr(goalId)` utility
- **Start**: In `lib/xirr.ts`
- **Logic**: 
  - Fetch only mutual fund transactions mapped to goal
  - Calculate XIRR for those
- **End**: Returns goal-level mutual fund XIRR

---

### ✅ Task 4: Add `getGoalAverageSIP(goalId)` utility
- **Start**: In `lib/portfolioUtils.ts`
- **Logic**:
  - Fetch mutual fund transactions mapped to the goal
  - Aggregate SIPs over last 6–12 months
- **End**: Returns average monthly SIP for goal

---

### ✅ Task 5: Add `getGoalCurrentValue(goalId)` utility
- **Start**: In `lib/portfolioUtils.ts`
- **Logic**:
  - Sum current value of mutual funds, stocks, NPS mapped to the goal
- **End**: Returns total corpus value of that goal

---

## 🧱 PHASE 2: API Enhancements

### ✅ Task 6: Extend `POST /api/simulate-goal` to accept existingCorpus
- **Start**: Add new field to request schema
- **Logic**: Pass to goal simulator logic
- **End**: Simulation considers existingCorpus in results

---

### ✅ Task 7: Modify goal-prefill logic to use new backend utilities
- **Start**: Inside goal autofill handler
- **Logic**:
  - Use `goalId` to get corpus, XIRR, SIP, and target
- **End**: Response contains all prefill fields

---

## 🧱 PHASE 3: Frontend Enhancements

### ✅ Task 8: Add `existingCorpus` input to `GoalSimulatorForm`
- **Start**: Extend form UI with new field
- **Validation**: Should be ≥ 0
- **End**: Value is included in simulation payload

---

### ✅ Task 9: Add goal selector dropdown
- **Start**: Fetch goals via Supabase client
- **UI**: Dropdown with all user goals, option to leave blank
- **End**: Selection populates simulation form

---

### ✅ Task 10: On goal select, auto-fill form values
- **Start**: Add effect on goal selection
- **Logic**: Fetch and set:
  - Corpus → from `getGoalCurrentValue`
  - SIP → from `getGoalAverageSIP`
  - XIRR → from `getGoalXirr`
  - Target → from goal table
- **End**: Form fields updated and remain editable

---

### ✅ Task 11: Update corpus chart to start from existing corpus
- **Start**: Update `GoalProjectionChart.tsx`
- **Logic**: Y-axis starts from existingCorpus instead of zero
- **End**: Accurate chart rendering

---

### ✅ Task 12: Update simulation summary table to show corpus
- **Start**: Add row/column for existing corpus
- **End**: Table shows new input correctly

---

## 🧪 PHASE 4: Testing

### ✅ Task 13: Add unit tests for updated `goalSimulator.ts` functions
- **Cases**:
  - With/without existing corpus
  - Step-up edge cases
- **End**: All new logic is covered

---

### ✅ Task 14: Add integration tests for goal prefill API
- **Start**: Test response values for known goals
- **End**: Validate XIRR, SIP, and corpus values returned

---

### ✅ Task 15: Final form validation and UX polish
- **Start**: Add inline validation for new fields
- **Check**:
  - Corpus >= 0
  - Error display
- **End**: UI is production-ready

---

Once complete, users will be able to simulate both ad-hoc and goal-linked scenarios with full financial context — including current investments.
