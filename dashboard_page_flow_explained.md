
# Dashboard Page Load Flow – Developer Notes

## 1. The Big Picture: How a Dashboard Page Loads

When you visit the dashboard in your browser (e.g., `/dashboard`), the following happens:

### a. `app/dashboard/page.tsx` is Invoked
- This is the main file for your dashboard page.
- It is a React component (function) that controls what you see on the dashboard.
- It is responsible for fetching all the data needed for the dashboard (like your goals, portfolio, stock prices, etc.).

### b. Data Fetching Happens in `page.tsx`
- Inside `page.tsx`, there are React hooks (`useEffect`) that run when the page loads.
- These hooks call functions that fetch data from your database (Supabase) and APIs.
- For example, it fetches:
  - Your goals
  - Your portfolio summary
  - Stock prices
  - Mutual fund values
- The data is fetched using Supabase client methods (e.g., `supabase.from('goals').select('*')`).

### c. Data is Stored in State
- The fetched data is stored in React state variables (using `useState`).
- When the data is ready, the page re-renders to show the latest info.

---

## 2. Rendering the Dashboard

### a. `page.tsx` Renders Child Components
- Once the data is loaded, `page.tsx` renders various child components to display the data.
- One of the main child components is `GoalCard`.

### b. `GoalCard.tsx` is Invoked for Each Goal
- For every goal in your data, `page.tsx` renders a `GoalCard` component.
- For example, if you have 3 goals, there will be 3 `GoalCard` components on the page.
- Each `GoalCard` receives the data for one goal as a prop (input).

---

## 3. How Data Flows

### a. Database Query in `page.tsx`
- The actual database queries (to Supabase) are run in `page.tsx`.
- For example, to get all your goals:
  - Apply to `page.tsx`
- Similarly, it fetches stocks, mutual fund portfolios, etc.

### b. Passing Data to `GoalCard`
- After fetching and processing, `page.tsx` passes the relevant data for each goal to its corresponding `GoalCard`:
  - Apply to `page.tsx`

### c. Rendering in `GoalCard.tsx`
- `GoalCard` is a presentational component: it takes the data for one goal and displays it (progress, amounts, investment breakdown, etc.).
- It does not fetch data from the database itself; it only uses what is passed to it.

---

## 4. Where Each File Fits

| File | Role/Responsibility |
|------|----------------------|
| `app/dashboard/page.tsx` | Main dashboard page. Fetches all data from Supabase. Passes data to child components. |
| `components/GoalCard.tsx` | Displays info for a single goal. Receives all data as props from `page.tsx`. |
| Supabase client (`lib/...`) | Used by `page.tsx` to run queries to your database. |

---

## 5. When is Each Invoked?

- `page.tsx`: Invoked when you visit `/dashboard`. Runs data fetching logic on page load.
- Database queries: Run inside `page.tsx` (in `useEffect` or async functions).
- `GoalCard.tsx`: Invoked once for each goal, every time the dashboard is rendered or updated.

---

## 6. Typical Flow Example

1. User visits `/dashboard`.
2. `page.tsx` runs, starts fetching data from Supabase.
3. When data is ready, stores it in state.
4. `page.tsx` renders a list of `GoalCard` components, one for each goal, passing each its data.
5. Each `GoalCard` displays the goal’s details (using only the data it received).

---

## 7. Where to Debug

- If data is missing or incorrect, the issue is almost always in `page.tsx` (data fetching or processing).
- `GoalCard.tsx` only displays what it is given.
- If you want to see what data is being passed to each `GoalCard`, you can add a `console.log(goal)` at the top of the `GoalCard` function.
