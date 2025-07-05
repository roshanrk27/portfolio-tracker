# 📈 Stock Price Caching & INR Conversion System

This document describes the complete stock price caching and INR conversion system implemented in the portfolio tracker application.

## 🏗️ System Architecture

### Overview
The system provides real-time stock prices with automatic INR conversion, intelligent caching, and fallback mechanisms for reliability.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Route     │    │   Yahoo Finance │
│   (React)       │◄──►│   /api/stock-   │◄──►│   API           │
│                 │    │   prices        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         └─────────────►│   Supabase      │
                        │   Cache Table   │
                        │   stock_prices_ │
                        │   cache         │
                        └─────────────────┘
```

## 🗄️ Database Schema

### `stock_prices_cache` Table

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

**Fields:**
- `symbol`: Yahoo Finance symbol (e.g., 'TCS.NS', 'MSFT')
- `price_inr`: Price converted to INR
- `price_original`: Original price in source currency
- `currency`: Original currency (USD, INR, etc.)
- `exchange_rate_to_inr`: Exchange rate used for conversion
- `updated_at`: Timestamp of last update

## 🔄 Caching Logic

### Cache Time Strategy
- **Weekdays (Monday-Friday)**: 30-minute cache time
- **Weekends (Saturday-Sunday)**: 24-hour cache time
- **Rationale**: Markets are closed on weekends, so data doesn't change frequently

### Cache Status Classification
```typescript
interface CacheStatus {
  fresh: string[]    // Updated within cache time
  stale: string[]    // Exists but older than cache time
  missing: string[]  // Not in cache at all
}
```

### Cache Flow
1. **Check Cache**: Query `stock_prices_cache` for requested symbols
2. **Classify**: Determine fresh/stale/missing based on `updated_at`
3. **Fetch Fresh**: Use cached data for fresh symbols
4. **Fetch Stale/Missing**: Get from Yahoo Finance API
5. **Store**: Update cache with new data
6. **Fallback**: If Yahoo Finance fails, use stale cache data

## 🌐 API Endpoints

### GET `/api/stock-prices`

**Purpose**: Fetch stock prices with caching and INR conversion

**Parameters:**
- `symbols` (query): Comma-separated list of Yahoo Finance symbols

**Example:**
```bash
GET /api/stock-prices?symbols=TCS.NS,MSFT,RELIANCE.NS
```

**Response:**
```json
{
  "success": true,
  "prices": {
    "TCS.NS": {
      "price": 3850.50,
      "currency": "INR",
      "exchangeRate": 83.25,
      "originalPrice": 46.25,
      "originalCurrency": "USD"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "cache": {
    "fresh": 2,
    "stale": 1,
    "missing": 0
  },
  "fallback": false,
  "stale": false
}
```

## 💱 INR Conversion Process

### Exchange Rate Fetching
```typescript
async function fetchUSDToINR(): Promise<number | null> {
  const result = await fetchYahooStockPrices(['USDINR=X'])
  return result.prices['USDINR=X']?.price || null
}
```

### Conversion Logic
```typescript
// For USD stocks
if (data.currency === 'USD' && data.price) {
  convertedPrice = data.price * usdToInrRate
  currency = 'INR'
  exchangeRate = usdToInrRate
}
// For INR stocks (already in INR)
else {
  convertedPrice = data.price
  currency = 'INR'
}
```

## 🔄 Cron Job (Prefetch)

### Function: `supabase/functions/prefetch-stock-prices`

**Schedule**: Every 30 minutes on weekdays only

**Process:**
1. Fetch all unique stock symbols from `stocks` table
2. Convert to Yahoo Finance symbols using exchange mapping
3. Fetch prices in batches of 50 (Yahoo Finance limit)
4. Convert USD prices to INR
5. Store in `stock_prices_cache` table

**Exchange Mapping:**
```typescript
const EXCHANGE_MAPPING = {
  'NSE': '.NS',      // TCS → TCS.NS
  'BSE': '.BO',      // RELIANCE → RELIANCE.BO
  'NASDAQ': '',      // MSFT → MSFT
  'NYSE': ''         // AAPL → AAPL
}
```

## 🛡️ Error Handling & Fallback

### Fallback Strategy
1. **Primary**: Fetch from Yahoo Finance API
2. **Fallback**: Use stale cached data if API fails
3. **Graceful Degradation**: Show "stale data" indicator

### Error Scenarios
- **Yahoo Finance API Down**: Use cached data with stale indicator
- **Cache Empty**: Return empty prices
- **Network Issues**: Continue with available data

## 🎯 Frontend Integration

### React Query Caching
```typescript
const {
  data: stockPrices,
  isLoading: stockPricesLoading
} = useQuery({
  queryKey: ['stockPrices'],
  queryFn: fetchStockPrices,
  staleTime: 1000 * 60 * 30, // 30 minutes
  gcTime: 1000 * 60 * 30,    // 30 minutes
  refetchOnWindowFocus: false
})
```

### Stale Data Indicator
```typescript
// Shows when data is from cache (not fresh)
<StaleDataIndicator isStale={isDataStale} />
```

## 📊 Performance Optimizations

### Batch Processing
- **API Calls**: Process symbols in batches of 10
- **Cron Job**: Process in batches of 50
- **Database**: Use `IN` clauses for bulk operations

### Caching Strategy
- **Frontend**: React Query with 30-minute cache
- **Backend**: Supabase table with smart cache times
- **Weekend Handling**: Extended cache time (24 hours)

### Memory Efficiency
- **Symbol Mapping**: Efficient exchange suffix mapping
- **Price Conversion**: On-demand INR conversion
- **Error Recovery**: Graceful degradation with fallbacks

## 🔧 Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Cache Configuration
```typescript
// Weekdays: 30 minutes
// Weekends: 24 hours
const cacheTimeMinutes = isWeekend ? 24 * 60 : 30
```

## 🧪 Testing

### Test Endpoints
- `/test-stock-cache`: Debug cache and API responses
- `/api/stock-prices`: Direct API testing

### Test Scenarios
1. **Fresh Data**: Verify correct prices and no stale indicator
2. **Stale Data**: Verify stale indicator and fallback behavior
3. **API Failure**: Verify fallback to cached data
4. **Weekend Behavior**: Verify extended cache times

## 📈 Monitoring

### Log Messages
```typescript
console.log(`[STOCK-PRICES] Cache status - Fresh: ${fresh.length}, Stale: ${stale.length}, Missing: ${missing.length}`)
console.log(`[STOCK-PRICES] Using fallback to stale cached prices`)
console.log(`[STOCK-PRICES] Cache check - Weekend: ${isWeekend}, Cache time: ${cacheTimeMinutes} minutes`)
```

### Metrics to Monitor
- Cache hit/miss rates
- API failure rates
- Fallback usage frequency
- Weekend vs weekday performance

## 🚀 Deployment

### Supabase Functions
```bash
# Deploy cron job function
supabase functions deploy prefetch-stock-prices

# Set up cron schedule (every 30 minutes on weekdays)
# Configure in Supabase Dashboard → Functions → Cron Jobs
```

### Database Setup
```sql
-- Run the stock_prices_cache table creation
-- Enable RLS policies
-- Set up appropriate indexes
```

## 🔄 Future Enhancements

### Potential Improvements
1. **Multiple Data Sources**: Add Google Finance as backup
2. **Real-time Updates**: WebSocket connections for live prices
3. **Advanced Caching**: Redis for better performance
4. **Market Hours**: Smart cache based on market open/close times
5. **Currency Support**: Support for more currencies beyond USD/INR

### Scalability Considerations
- **Rate Limiting**: Respect Yahoo Finance API limits
- **Database Indexing**: Optimize for symbol lookups
- **CDN Caching**: Cache API responses at edge
- **Load Balancing**: Distribute API calls across multiple instances

---

This system provides reliable, performant stock price data with intelligent caching, automatic INR conversion, and robust error handling for a production-ready portfolio tracking application. 