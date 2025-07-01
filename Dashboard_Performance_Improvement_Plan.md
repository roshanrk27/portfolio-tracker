# Dashboard Performance Improvement Plan

> ⚠️ **Important:** No change should break any existing functionality. All updates must preserve current features and expected behavior.

> ✅ **Process Guidance:**  
> - Each step should be completed and tested independently before moving to the next.  
> - After each step, measure dashboard load time and user experience to confirm improvement.

---

## 1. Eliminate Redundant Stock Price API Calls

**Task:**  
Audit and refactor the dashboard's stock price fetching logic to ensure each stock's price is fetched only once per page load.

- **Start:** Identify all locations in the dashboard and related components where stock price API calls are made.  
- **End:** Each stock triggers at most one API call per page load; verify via logs and network tab.

---

## 2. Batch Stock Price Requests

**Task:**  
Refactor the dashboard to use the `POST /api/stock-prices` endpoint for batch fetching of stock prices, instead of making individual requests per stock.

- **Start:** Locate all code that fetches stock prices individually.  
- **End:** All stock prices are fetched in a single batch request (or as few as possible, respecting API limits); verify via network tab.

---

## 3. Add Client-Side Caching for Stock Prices

**Task:**  
Implement a simple in-memory cache (e.g., React state or context) for stock prices during a session to avoid re-fetching the same data.

- **Start:** Identify where stock prices are stored and accessed in state.  
- **End:** Repeated requests for the same stock within a session use cached data; verify by checking no duplicate network requests.

---

## 4. Profile and Optimize Database Queries

**Task:**  
Profile the SQL queries used for portfolio, NAV, and stock data fetching. Add indexes or optimize queries as needed.

- **Start:** Use query logs or `EXPLAIN` to identify slow queries in Supabase/Postgres.  
- **End:** All dashboard-related queries execute in under 100ms; verify via query logs.

---

## 5. Parallelize Data Fetching in Dashboard

**Task:**  
Ensure all independent data fetching (portfolio, stocks, goals, NAV, NPS) is done in parallel using `Promise.all`.

- **Start:** Review all async data fetching in the dashboard's `useEffect` and helper functions.  
- **End:** All independent fetches are parallelized; verify by timing and logs.

---

## 6. Minimize Data Sent to Client

**Task:**  
Audit the data returned from API/database calls and ensure only necessary fields are sent to the client.

- **Start:** Review API and SQL `SELECT` statements for unnecessary fields.  
- **End:** Only required fields are sent; verify by inspecting API responses.

---

## 7. Prevent Unnecessary Component Re-renders

**Task:**  
Use `React.memo`, `useCallback`, and `useMemo` to prevent unnecessary re-renders in dashboard and child components.

- **Start:** Profile component renders using React DevTools.  
- **End:** Only components with changed props/state re-render; verify via DevTools.

---

## 8. Add Loading Skeletons for Slow Sections

**Task:**  
Ensure all slow-loading sections (e.g., stock summary, goals) show skeletons or placeholders to improve perceived performance.

- **Start:** Identify all sections that may load slowly.  
- **End:** All such sections show skeletons until data is ready; verify visually.

---

## 9. Implement Error Handling and Fallbacks

**Task:**  
Add robust error handling for all API and data fetching logic, with user-friendly error messages and retry options.

- **Start:** Review all fetch/async calls for error handling.  
- **End:** All errors are caught and surfaced to the user with retry; verify by simulating failures.

---

## 10. Monitor and Log Performance Metrics

**Task:**  
Add logging for API response times and client-side load times to monitor improvements and catch regressions.

- **Start:** Add timing logs to key API endpoints and dashboard mount.  
- **End:** Performance metrics are available for review; verify via logs.