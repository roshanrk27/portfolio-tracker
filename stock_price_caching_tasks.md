# 📈 Stock Price Caching & INR Conversion Task Breakdown

This document provides a detailed, step-by-step plan for improving performance by offloading and caching stock price fetching with INR conversion. It uses the `yahoo-finance2` package on the backend and caches results in Supabase.

---

## ✅ Task List

### T1. Install yahoo-finance2 and Configure Backend
**Description**: Add `yahoo-finance2` to the project via npm/yarn and set up a utility wrapper to fetch stock prices. Ensure utility can also extract currency and identify non-INR values.

**Testable Output**: Running the utility fetches prices for `['TCS.NS', 'MSFT']` and includes currency field in output.

---

### T2. Create Supabase Table for Stock Price Cache
**Description**: Create a table named `stock_prices_cache` with the following schema:

```sql
CREATE TABLE stock_prices_cache (
  symbol TEXT PRIMARY KEY,
  price_inr NUMERIC NOT NULL,
  price_original NUMERIC,
  currency TEXT,
  exchange_rate_to_inr NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

This allows conversion tracking from foreign currencies to INR.

**Testable Output**: Table created with fields for both INR and original currency values.

---

### T3. Create Backend API Route `/api/stock-prices`
**Description**:
- Accepts `symbols` as a query param
- Checks `stock_prices_cache` for records updated in the last 30 mins
- Fetches from Yahoo Finance if any records are stale or missing
- Converts price to INR using exchange rate from Yahoo Finance or Google Finance
- Stores both original price and INR price

**Testable Output**: Requesting `/api/stock-prices?symbols=TCS.NS,MSFT` returns INR and original prices, with caching.

---

### T4. Store Fetched Prices in Supabase Cache
**Description**: For each fetched symbol, store:
- Original price and currency
- Exchange rate to INR
- Converted INR price
- Timestamp  
Use upsert into `stock_prices_cache`.

**Testable Output**: Supabase table contains INR and original prices with updated timestamp.

---

### T5. Implement Supabase Cron Job for Prefetching Prices
**Description**: Create a cron job or scheduled Supabase function to run every 30 mins.
- Fetch a predefined list of commonly used stock symbols
- Update INR prices in the cache

**Testable Output**: Job runs every 30 mins and refreshes cached prices.

---

### T6. Update Stock Value Calculations Across the Site
**Description**: Ensure all portfolio valuation and stock-related computations use `price_inr` from `stock_prices_cache`.

**Testable Output**: Portfolio values reflect accurate INR conversions from cached data.

---

### T7. Implement React Query with 30 min Cache for Frontend
**Description**: Use React Query to fetch from `/api/stock-prices`, with `staleTime` and `cacheTime` set to 30 mins.

**Testable Output**: Frontend shows prices with no refetch for 30 mins unless manually triggered.

---

### T8. Add Error Fallback for API Fetch Failures
**Description**: If Yahoo/Google Finance fails:
- Return last known price with a `stale: true` flag
- Log the failure for future retries

**Testable Output**: Frontend continues showing last price with indicator, logs show fallback mode.

---

### T9. Document the Stock Price Caching and INR Conversion Logic ✅
**Description**: Create a README section describing:
- Yahoo fetch + INR conversion
- Caching logic
- API route usage
- Supabase schema for `stock_prices_cache`

**Testable Output**: README file exists with explanation of INR logic and API integration.

---

## 🎉 All Tasks Completed!

The stock price caching and INR conversion system is now fully implemented with:

✅ **T1-T9**: Complete system from backend setup to documentation
✅ **Smart Caching**: Weekend-aware cache times
✅ **Error Handling**: Graceful fallback mechanisms
✅ **Performance**: Optimized batch processing
✅ **Documentation**: Comprehensive system documentation
