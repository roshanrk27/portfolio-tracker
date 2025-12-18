# AI Coach API Documentation

**LLM-Optimized Portfolio Analytics API for CrewAI Integration**

This API provides portfolio analytics and simulation endpoints specifically designed for CrewAI agent integration. All responses include natural language summaries, formatted values, and contextual metadata for optimal LLM comprehension.

## Base URL

```
https://your-portfolio-tracker.vercel.app/api/ai-coach
```

## Authentication

All endpoints require API key authentication via the `X-AI-Coach-API-Key` header.

```bash
curl -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  https://your-app/api/ai-coach/goals/user/USER_ID
```

**Environment Variable:** Set `AI_COACH_API_KEY` in your deployment environment (both `.env.local` and production).

---

## Environment Variables

In addition to the API key above, the AI Coach module reads several environment variables. Set these in `.env.local` for development and in your hosting provider for production.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✔︎ | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✔︎ | — | Supabase anonymous key used client-side |
| `SUPABASE_SERVICE_ROLE_KEY` | ✔︎ | — | Supabase service role key used server-side |
| `NAV_REFRESH_API_KEY` | ✔︎ | — | Shared secret for automated NAV refresh |
| `PERPLEXITY_API_KEY` | Optional | — | API key for the LLM provider that enriches fund facts (required when enabling fund facts) |
| `FUND_FACTS_USE_LLM` | Optional | `false` | Toggle LLM-backed fund facts (`true` / `false`) |
| `FUND_FACTS_MIN_CONFIDENCE` | Optional | `medium` | Minimum LLM confidence accepted (`high` or `medium`) |
| `FUND_FACTS_TTL_DAYS` | Optional | `30` | Cache freshness window for fund facts (positive integer days) |
| `FUND_FACTS_MAX_DAILY_CALLS` | Optional | `100` | Maximum LLM fund-facts calls per day (positive integer) |
| `FUND_FACTS_MAX_BATCH_SIZE` | Optional | `10` | Maximum number of funds per batch request (positive integer) |

**Example `.env.local`:**

```
AI_COACH_API_KEY=your_api_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NAV_REFRESH_API_KEY=your_nav_refresh_key
PERPLEXITY_API_KEY=your_perplexity_key
FUND_FACTS_USE_LLM=false
FUND_FACTS_MIN_CONFIDENCE=medium
FUND_FACTS_TTL_DAYS=30
FUND_FACTS_MAX_DAILY_CALLS=100
FUND_FACTS_MAX_BATCH_SIZE=10
```

---

## Endpoints

### 1. Get User Goals

**GET** `/goals/user/{userId}`

Fetch all financial goals for a user with full LLM-friendly details including progress, XIRR, and asset allocations.

**Path Parameters:**
- `userId` (string, required) - User UUID

**Sample Request:**
```bash
curl -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  https://your-app/api/ai-coach/goals/user/550e8400-e29b-41d4-a716-446655440000
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "goals": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Retirement Fund",
        "description": "Save for retirement by 2030",
        "target_amount": 2000000,
        "target_amount_formatted": "₹20L",
        "target_date": "2030-12-31",
        "target_date_formatted": "Dec 2030 (5yr 3m away)",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "current_amount": 500000,
        "current_amount_formatted": "₹5L",
        "gap_amount": 1500000,
        "gap_amount_formatted": "₹15L",
        "time_remaining_formatted": "5yr 3m",
        "months_remaining": 63,
        "days_remaining": 1900,
        "progress_percentage": 25.0,
        "progress_description": "25% completed - Good progress",
        "xirr": 0.123,
        "xirrPercentage": 12.3,
        "formattedXIRR": "+12.30%",
        "xirrConverged": true,
        "xirrError": null,
        "xirr_interpretation": "Strong 12.3% annualized return",
        "mutual_fund_value": 300000,
        "mutual_fund_value_formatted": "₹3L",
        "stock_value": 150000,
        "stock_value_formatted": "₹1.5L",
        "nps_value": 50000,
        "nps_value_formatted": "₹50K",
        "allocation_breakdown": "60% MF, 30% Stocks, 10% NPS",
        "mappedStocks": [
          {
            "stock_code": "RELIANCE",
            "quantity": 10,
            "exchange": "NSE",
            "source_id": "stock-uuid-1"
          }
        ]
      }
    ],
    "total_goals": 1
  },
  "_summary": "User has 1 financial goal worth ₹20L, with ₹5L currently invested (25.0% overall progress).",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "2024-11-02T10:30:00.000Z",
    "dataFreshness": "real-time"
  }
}
```

---

### 2. Get Goal Details

**GET** `/goals/{goalId}/details`

Get detailed information for a specific goal including individual mutual fund schemes, stocks, and NPS holdings.

**Path Parameters:**
- `goalId` (string, required) - Goal UUID

**Sample Request:**
```bash
curl -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  https://your-app/api/ai-coach/goals/123e4567-e89b-12d3-a456-426614174000/details
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Retirement Fund",
    "description": "Save for retirement by 2030",
    "target_amount": 2000000,
    "target_amount_formatted": "₹20L",
    "target_date": "2030-12-31",
    "target_date_formatted": "02/12/2030",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "current_amount": 500000,
    "current_amount_formatted": "₹5L",
    "gap_amount": 1500000,
    "gap_amount_formatted": "₹15L",
    "time_remaining_formatted": "",
    "months_remaining": 0,
    "days_remaining": 0,
    "progress_percentage": 25.0,
    "progress_description": "",
    "mutual_fund_value": 300000,
    "mutual_fund_value_formatted": "₹3L",
    "stock_value": 150000,
    "stock_value_formatted": "₹1.5L",
    "nps_value": 50000,
    "nps_value_formatted": "₹50K",
    "allocation_breakdown": "₹3L in mutual funds, ₹1.5L in stocks, ₹50K in NPS",
    "mappedStocks": [
      {
        "stock_code": "RELIANCE",
        "quantity": 10,
        "exchange": "NSE",
        "source_id": "stock-uuid-1"
      },
      {
        "stock_code": "TCS",
        "quantity": 5,
        "exchange": "NSE",
        "source_id": "stock-uuid-2"
      }
    ],
    "mappedMutualFunds": [
      {
        "mapping_id": "mapping-uuid-1",
        "scheme_name": "Axis Bluechip Fund - Direct Growth",
        "folio": "FOL123456",
        "allocation_percentage": 50,
        "current_value": 200000,
        "current_value_formatted": "₹2L",
        "balance_units": 493.5,
        "current_nav": 405.25,
        "total_invested": 150000,
        "return_amount": 50000,
        "return_percentage": 33.33
      },
      {
        "mapping_id": "mapping-uuid-2",
        "scheme_name": "HDFC Balanced Advantage Fund - Direct Growth",
        "folio": "FOL789012",
        "allocation_percentage": 50,
        "current_value": 100000,
        "current_value_formatted": "₹1L",
        "balance_units": 245.8,
        "current_nav": 407.10,
        "total_invested": 90000,
        "return_amount": 10000,
        "return_percentage": 11.11
      }
    ]
  },
  "_summary": "Goal \"Retirement Fund\" has target of ₹20L with ₹5L currently invested (₹3L in mutual funds, ₹1.5L in stocks, ₹50K in NPS). Stocks: RELIANCE, TCS | Mutual funds: Axis Bluechip Fund - Direct Growth, HDFC Balanced Advantage Fund - Direct Growth.",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "2024-11-02T10:30:00.000Z",
    "dataFreshness": "real-time"
  }
}
```

**Key Fields:**
- `mappedMutualFunds`: Array of individual mutual fund schemes with full details (scheme name, folio, units, NAV, returns)
- `mappedStocks`: Array of individual stock holdings
- All amounts include both raw numbers and formatted strings

---

### 3. Get Goal XIRR

**GET** `/goals/{goalId}/xirr`

Calculate XIRR (Extended Internal Rate of Return) for a specific goal with performance interpretation.

**Path Parameters:**
- `goalId` (string, required) - Goal UUID

**Sample Request:**
```bash
curl -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  https://your-app/api/ai-coach/goals/123e4567-e89b-12d3-a456-426614174000/xirr
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "xirr": 0.123,
    "xirrPercentage": 12.3,
    "formattedXIRR": "+12.30%",
    "converged": true,
    "error": null,
    "xirr_interpretation": "Strong 12.3% annualized return",
    "performance_category": "High",
    "comparison_context": "Above average performance",
    "current_value": 500000
  },
  "_summary": "Goal is generating +12.30% annualized returns. Strong 12.3% annualized return. Above average performance",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "2024-11-02T10:30:00.000Z",
    "dataFreshness": "real-time"
  }
}
```

**Performance Categories:**
- `High`: ≥12% (Strong/Excellent returns)
- `Medium`: 7-12% (Good/Moderate returns)
- `Low`: <7% (Below average/Poor returns)

---

### 4. Get Average Monthly Investment

**GET** `/goals/{goalId}/average-investment`

Get average monthly investment (SIP) for a goal over the last 12 months with trend analysis.

**Path Parameters:**
- `goalId` (string, required) - Goal UUID

**Sample Request:**
```bash
curl -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  https://your-app/api/ai-coach/goals/123e4567-e89b-12d3-a456-426614174000/average-investment
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "goalId": "123e4567-e89b-12d3-a456-426614174000",
    "averageMonthlyInvestment": 12500,
    "averageMonthlyInvestment_formatted": "₹12,500/month",
    "periodMonths": 12,
    "trend": "stable",
    "trend_description": "Consistent monthly investment pattern over the last 12 months"
  },
  "_summary": "Average monthly investment of ₹12,500 over the last 12 months, showing stable commitment.",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "2024-11-02T10:30:00.000Z",
    "dataFreshness": "real-time"
  }
}
```

**Trend Values:**
- `increasing` - Investment amount growing over time
- `stable` - Consistent monthly investment
- `decreasing` - Investment amount declining

---

### 5. Get Portfolio Summary

**GET** `/portfolio/{userId}/summary`

Get overall portfolio summary with total holdings, invested amount, current value, and returns.

**Path Parameters:**
- `userId` (string, required) - User UUID

**Sample Request:**
```bash
curl -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  https://your-app/api/ai-coach/portfolio/550e8400-e29b-41d4-a716-446655440000/summary
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "totalHoldings": 15,
    "holdings_description": "15 mutual fund schemes",
    "totalCurrentValue": 1580000,
    "totalCurrentValue_formatted": "₹15.8L",
    "totalNavValue": 1580000,
    "entriesWithNav": 15,
    "nav_status": "Latest NAV updated on 02/11/2024",
    "performance_summary": "Portfolio actively managed with current holdings"
  },
  "_summary": "Portfolio valued at ₹15.8L across 15 mutual fund schemes.",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "2024-11-02T10:30:00.000Z",
    "dataFreshness": "real-time"
  }
}
```

**Note:** This endpoint provides current portfolio value and holdings count. For return calculations (including XIRR), use the `/portfolio/{userId}/xirr` endpoint.

---

### 6. Get Portfolio XIRR

**GET** `/portfolio/{userId}/xirr`

Calculate overall portfolio XIRR with per-scheme breakdown and identify top/worst performers.

**Path Parameters:**
- `userId` (string, required) - User UUID

**Sample Request:**
```bash
curl -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  https://your-app/api/ai-coach/portfolio/550e8400-e29b-41d4-a716-446655440000/xirr
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "xirr": 0.142,
      "xirrPercentage": 14.2,
      "formattedXIRR": "+14.20%",
      "converged": true,
      "error": null,
      "xirr_interpretation": "Strong 14.2% annualized return",
      "performance_category": "High",
      "comparison_context": "Above average performance",
      "current_value": 1580000,
      "current_value_formatted": "₹15.8L"
    },
    "schemes": [
      {
        "scheme_name": "Axis Bluechip Fund - Direct Growth",
        "folio": "FOL123456",
        "xirr": 0.185,
        "xirrPercentage": 18.5,
        "formattedXIRR": "+18.50%",
        "current_value": 500000,
        "current_value_formatted": "₹5L"
      },
      {
        "scheme_name": "HDFC Balanced Advantage Fund - Direct Growth",
        "folio": "FOL789012",
        "xirr": 0.062,
        "xirrPercentage": 6.2,
        "formattedXIRR": "+6.20%",
        "current_value": 300000,
        "current_value_formatted": "₹3L"
      }
    ],
    "top_performer": {
      "scheme_name": "Axis Bluechip Fund - Direct Growth",
      "xirr_formatted": "+18.50%"
    },
    "worst_performer": {
      "scheme_name": "HDFC Balanced Advantage Fund - Direct Growth",
      "xirr_formatted": "+6.20%"
    },
    "portfolio_health": "Healthy"
  },
  "_summary": "Portfolio generating +14.20% annualized returns with best performer at +18.50% and weakest at +6.20%. Strong 14.2% annualized return. Above average performance. 2 schemes analyzed.",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "2024-11-02T10:30:00.000Z",
    "dataFreshness": "real-time"
  }
}
```

**Portfolio Health Values:**
- `Healthy`: XIRR ≥ 10%
- `Needs attention`: XIRR 7-10%
- `At risk`: XIRR < 7%

---

### 7. Get Asset Allocation

**GET** `/portfolio/{userId}/allocation`

Get asset allocation breakdown (Equity/Debt/Hybrid) with risk profile and diversification assessment.

**Path Parameters:**
- `userId` (string, required) - User UUID

**Sample Request:**
```bash
curl -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  https://your-app/api/ai-coach/portfolio/550e8400-e29b-41d4-a716-446655440000/allocation
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "allocations": [
      {
        "category": "Equity",
        "value": 950000,
        "value_formatted": "₹9.5L",
        "percentage": 60.1,
        "percentage_formatted": "60.1%",
        "count": 9,
        "count_description": "9 equity schemes",
        "color": "#3b82f6",
        "risk_level": "High",
        "category_description": "Growth-oriented investments in stocks with higher volatility"
      },
      {
        "category": "Debt",
        "value": 470000,
        "value_formatted": "₹4.7L",
        "percentage": 29.7,
        "percentage_formatted": "29.7%",
        "count": 5,
        "count_description": "5 debt schemes",
        "color": "#10b981",
        "risk_level": "Low",
        "category_description": "Stable fixed-income investments with lower risk"
      },
      {
        "category": "Hybrid",
        "value": 160000,
        "value_formatted": "₹1.6L",
        "percentage": 10.1,
        "percentage_formatted": "10.1%",
        "count": 1,
        "count_description": "1 hybrid schemes",
        "color": "#f59e0b",
        "risk_level": "Medium",
        "category_description": "Balanced mix of equity and debt for moderate risk-return"
      }
    ],
    "totalValue": 1580000,
    "allocation_summary": "60% Equity, 30% Debt, 10% Hybrid",
    "risk_profile": "Moderately Aggressive",
    "diversification_score": "Well diversified",
    "rebalancing_suggestion": "Consider reducing equity exposure by 10-15% and adding to debt for better balance",
    "timestamp": "2024-11-02T10:30:00.000Z"
  },
  "_summary": "Moderately Aggressive allocation: 60% Equity, 30% Debt, 10% Hybrid. Portfolio valued at ₹15.8L. Well diversified.",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "2024-11-02T10:30:00.000Z",
    "dataFreshness": "real-time"
  }
}
```

**Risk Profile Values:**
- `Very Conservative`: Equity < 20%
- `Conservative`: Equity 20-30%, Debt ≥ 50%
- `Moderately Conservative`: Equity 20-30%
- `Moderate`: Equity 30-50%
- `Moderately Aggressive`: Equity 50-70%
- `Aggressive`: Equity ≥ 70%

**Diversification Scores:**
- `Well diversified`: ≥3 categories, ≥10 schemes
- `Moderately diversified`: ≥2 categories, ≥6 schemes
- `Basic diversification`: ≥2 categories
- `Under-diversified`: <2 categories

---

### 8. Simulate Goal SIP

**POST** `/simulate`

Calculate required monthly SIP to reach a goal and generate step-up scenarios for comparison.

**Request Body:**
```json
{
  "goalId": "optional-uuid",
  "targetAmount": 2000000,
  "months": 120,
  "xirrPercent": 12,
  "existingCorpus": 500000,
  "stepUpPercent": 10,
  "includeScenarios": true
}
```

**Request Parameters:**
- `targetAmount` (number, required) - Target amount in INR (> 0)
- `months` (integer, required) - Number of months until target date (> 0)
- `xirrPercent` (number, required) - Expected annual return percentage (≥ 0)
- `goalId` (string, optional) - Goal UUID for context
- `existingCorpus` (number, optional) - Current corpus amount (default: 0)
- `stepUpPercent` (number, optional) - Step-up percentage for base calculation (default: 0)
- `includeScenarios` (boolean, optional) - Include step-up scenarios (default: true)

**Sample Request:**
```bash
curl -X POST \
  -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "targetAmount": 2000000,
    "months": 120,
    "xirrPercent": 12,
    "existingCorpus": 500000,
    "includeScenarios": true
  }' \
  https://your-app/api/ai-coach/simulate
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "input": {
      "goalId": null,
      "targetAmount": 2000000,
      "targetAmount_formatted": "₹20L",
      "months": 120,
      "months_formatted": "10yr",
      "xirrPercent": 12,
      "existingCorpus": 500000,
      "existingCorpus_formatted": "₹5L",
      "stepUpPercent": 0,
      "includeScenarios": true
    },
    "base_calculation": {
      "requiredMonthlySIP": 15000,
      "requiredMonthlySIP_formatted": "₹15,000/month",
      "totalInvested": 1800000,
      "totalInvested_formatted": "₹18L",
      "finalCorpus": 2000000,
      "finalCorpus_formatted": "₹20L",
      "investment_description": "Invest ₹15,000/month for 10yr at +12.00% XIRR"
    },
    "scenarios": [
      {
        "stepUpPercent": 0,
        "stepUpPercent_formatted": "0% yearly",
        "monthlySIP": 15000,
        "monthlySIP_formatted": "₹15,000/month",
        "totalInvested": 1800000,
        "totalInvested_formatted": "₹18L",
        "finalCorpus": 2000000,
        "finalCorpus_formatted": "₹20L",
        "scenario_description": "Fixed SIP of ₹15,000/month",
        "recommendation_score": 1,
        "yearColumns": [
          {
            "year": 1,
            "sip": 15000,
            "sip_formatted": "₹15,000"
          },
          {
            "year": 5,
            "sip": 15000,
            "sip_formatted": "₹15,000"
          },
          {
            "year": 10,
            "sip": 15000,
            "sip_formatted": "₹15,000"
          }
        ]
      },
      {
        "stepUpPercent": 5,
        "stepUpPercent_formatted": "5% yearly",
        "monthlySIP": 11800,
        "monthlySIP_formatted": "₹11,800/month",
        "totalInvested": 1650000,
        "totalInvested_formatted": "₹16.5L",
        "finalCorpus": 2000000,
        "finalCorpus_formatted": "₹20L",
        "scenario_description": "Start with ₹11,800/month, increase by 5% yearly",
        "savings_vs_baseline": "Save ₹1.5L vs fixed SIP",
        "recommendation_score": 2,
        "yearColumns": [
          {
            "year": 1,
            "sip": 11800,
            "sip_formatted": "₹11,800"
          },
          {
            "year": 5,
            "sip": 14360,
            "sip_formatted": "₹14,360"
          },
          {
            "year": 10,
            "sip": 18290,
            "sip_formatted": "₹18,290"
          }
        ]
      },
      {
        "stepUpPercent": 10,
        "stepUpPercent_formatted": "10% yearly",
        "monthlySIP": 9800,
        "monthlySIP_formatted": "₹9,800/month",
        "totalInvested": 1560000,
        "totalInvested_formatted": "₹15.6L",
        "finalCorpus": 2000000,
        "finalCorpus_formatted": "₹20L",
        "scenario_description": "Start with ₹9,800/month, increase by 10% yearly",
        "savings_vs_baseline": "Save ₹2.4L vs fixed SIP",
        "recommendation_score": 5,
        "yearColumns": [
          {
            "year": 1,
            "sip": 9800,
            "sip_formatted": "₹9,800"
          },
          {
            "year": 5,
            "sip": 14315,
            "sip_formatted": "₹14,315"
          },
          {
            "year": 10,
            "sip": 25418,
            "sip_formatted": "₹25,418"
          }
        ]
      },
      {
        "stepUpPercent": 15,
        "stepUpPercent_formatted": "15% yearly",
        "monthlySIP": 8200,
        "monthlySIP_formatted": "₹8,200/month",
        "totalInvested": 1500000,
        "totalInvested_formatted": "₹15L",
        "finalCorpus": 2000000,
        "finalCorpus_formatted": "₹20L",
        "scenario_description": "Start with ₹8,200/month, increase by 15% yearly",
        "savings_vs_baseline": "Save ₹3L vs fixed SIP",
        "recommendation_score": 4,
        "yearColumns": [
          {
            "year": 1,
            "sip": 8200,
            "sip_formatted": "₹8,200"
          },
          {
            "year": 5,
            "sip": 14440,
            "sip_formatted": "₹14,440"
          },
          {
            "year": 10,
            "sip": 33188,
            "sip_formatted": "₹33,188"
          }
        ]
      },
      {
        "stepUpPercent": 20,
        "stepUpPercent_formatted": "20% yearly",
        "monthlySIP": 7100,
        "monthlySIP_formatted": "₹7,100/month",
        "totalInvested": 1470000,
        "totalInvested_formatted": "₹14.7L",
        "finalCorpus": 2000000,
        "finalCorpus_formatted": "₹20L",
        "scenario_description": "Start with ₹7,100/month, increase by 20% yearly",
        "savings_vs_baseline": "Save ₹3.3L vs fixed SIP",
        "recommendation_score": 3,
        "yearColumns": [
          {
            "year": 1,
            "sip": 7100,
            "sip_formatted": "₹7,100"
          },
          {
            "year": 5,
            "sip": 14734,
            "sip_formatted": "₹14,734"
          },
          {
            "year": 10,
            "sip": 43980,
            "sip_formatted": "₹43,980"
          }
        ]
      }
    ],
    "best_scenario": {
      "stepUpPercent": 10,
      "reasoning": "10% yearly step-up balances affordability with long-term wealth building. Start lower and increase as income grows."
    },
    "comparison_summary": "Fixed SIP requires ₹15,000/month. With 10% yearly step-up, start at ₹9,800/month and save ₹2.4L overall.",
    "_action_items": [
      "Start with SIP of ₹9,800/month",
      "Increase by 10% yearly every year",
      "Review annually and adjust based on goal progress"
    ]
  },
  "_summary": "To reach ₹20L in 10yr at +12.00%, need ₹15L/month. With 10% yearly step-up, start at ₹9,800/month, saving ₹2.4L overall.",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "2024-11-02T10:30:00.000Z",
    "dataFreshness": "real-time"
  }
}
```

**Recommendation Scores:**
- `5`: Optimal (typically 10% step-up)
- `4`: Good (15% step-up)
- `3`: Acceptable (20% step-up)
- `2`: Moderate (5% step-up)
- `1`: Basic (0% fixed SIP)

---

### 9. Get Fund Facts

**GET** `/funds/{fundId}/facts`

Return LLM-enhanced fact sheets for a single mutual fund, including cited performance metrics, fee data, and provenance metadata. The endpoint always validates the API key and fund identifier before responding. If LLM augmentation is disabled (`FUND_FACTS_USE_LLM=false`) or low-confidence data is rejected, the response gracefully falls back to deterministic placeholders.

**Path Parameters:**
- `fundId` (string, required) - AMFI `scheme_code` (numeric string). Non-numeric IDs are rejected with `400`.

**Sample Request:**
```bash
curl -H "X-AI-Coach-API-Key: YOUR_API_KEY" \
  https://your-app/api/ai-coach/funds/118834/facts
```

**Sample Response (`provenance: "llm+cited"`):**
```json
{
  "success": true,
  "data": {
    "fund_id": "118834",
    "scheme_name": "Axis Bluechip Fund - Direct Growth",
    "risk_return": {
      "cagr_1y": 0.185,
      "cagr_3y": 0.148,
      "cagr_5y": 0.142,
      "ret_ytd": 0.092,
      "ret_1m": 0.012,
      "ret_3m": 0.034,
      "ret_6m": 0.068,
      "vol_3y_ann": 0.135,
      "max_dd_5y": null
    },
    "fees_aum": {
      "expense_ratio_pct": 0.009,
      "aum_cr": 41.2
    },
    "provenance": "llm+cited",
    "llm_confidence": "high",
    "llm_as_of": "2024-11-01",
    "sources": [
      {
        "field": "performance.cagr_3y",
        "url": "https://example.com/source/cagr-3y",
        "as_of": "2024-11-01"
      },
      {
        "field": "facts.expense_ratio_pct",
        "url": "https://example.com/source/expense-ratio",
        "as_of": "2024-10-31"
      }
    ],
    "notes": {
      "llm": "Sanitized for suitability; excludes distributor recommendations."
    }
  },
  "_summary": "Fund facts for Axis Bluechip Fund - Direct Growth. Data provided with cited sources (confidence: high).",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "2024-11-02T10:30:00.000Z",
    "dataFreshness": "real-time"
  }
}
```

**Deterministic fallback example:**
```json
{
  "success": true,
  "data": {
    "fund_id": "118834",
    "scheme_name": "Axis Bluechip Fund - Direct Growth",
    "risk_return": {},
    "fees_aum": {},
    "provenance": "deterministic",
    "notes": {
      "llm": "LLM data unavailable or rejected for quality; deterministic metrics not yet implemented."
    }
  },
  "_summary": "Fund facts for Axis Bluechip Fund - Direct Growth. Data sourced from deterministic calculations only.",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "2024-11-02T10:30:00.000Z",
    "dataFreshness": "real-time"
  }
}
```

**Key Fields & Behaviors:**
- `provenance` is either `llm+cited` (LLM data merged with deterministic fields) or `deterministic` (fallback with explanatory note).
- `llm_confidence` and `llm_as_of` are returned only when LLM data passes guardrails and meets the configured `FUND_FACTS_MIN_CONFIDENCE`.
- `sources` includes up to the top 3 citations from the LLM provider to keep payloads concise.
- Performance metrics are expressed as decimals (e.g., `0.185` → 18.5% CAGR).
- Responses include the header `X-Request-ID`, which you can log for traceability when debugging fund-facts workflows.
- Fund facts are cached in Supabase (`fund_facts_llm`) for `FUND_FACTS_TTL_DAYS`; cached hits skip new LLM calls as long as confidence remains above the threshold.
- The LLM daily budget (configured via `FUND_FACTS_MAX_DAILY_CALLS`) enforces a 429 error with a `rate_limit` object once the allowance is exhausted for the day.

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2024-11-02T10:30:00.000Z"
}
```

**Common Error Codes:**
- `400` - Bad request (invalid parameters, validation errors)
  - Example: Invalid UUID format, missing required fields, negative values
- `401` - Unauthorized (invalid or missing API key)
  - Example: Missing `X-AI-Coach-API-Key` header or incorrect key
- `429` - Rate limit exceeded (fund facts daily LLM budget reached)
  - Example: Fund facts requests after `FUND_FACTS_MAX_DAILY_CALLS` is reached return a `rate_limit` payload with `type`, `retry_after`, `calls_today`, and `limit`
- `404` - Not found (goal/user not found)
  - Example: Goal ID doesn't exist in database
- `500` - Internal server error
  - Example: Database connection issues, calculation errors

**Sample Error Response:**
```json
{
  "success": false,
  "error": "Daily fund-facts budget exceeded: 100/100 calls used today. Please try again later.",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "rate_limit": {
    "type": "budget_exceeded",
    "retry_after": 86340,
    "calls_today": 100,
    "limit": 100
  }
}
```

---

## LLM-Friendliness Features

Every response includes LLM-optimized features:

### 1. Natural Language Summaries (`_summary`)
- 1-2 sentence overview of the data
- Pre-interpreted context for direct use in recommendations
- Example: "User has 2 financial goals worth ₹50L, with ₹15L currently invested (30.0% overall progress)."

### 2. Formatted Values
All numeric amounts include human-readable formats:
- `target_amount_formatted` → "₹20L" or "₹1.5Cr"
- `current_amount_formatted` → "₹5L"
- `time_remaining_formatted` → "5yr 3m"
- `formattedXIRR` → "+12.30%"

### 3. Contextual Metadata (`_metadata`)
- Currency: "INR"
- Units: "Indian Rupees"
- Data freshness: "real-time"
- Timestamp for cache management

### 4. Performance Interpretations
Pre-calculated assessments:
- `xirr_interpretation`: "Strong 12.3% annualized return"
- `performance_category`: "High", "Medium", or "Low"
- `portfolio_health`: "Healthy", "Needs attention", or "At risk"
- `risk_profile`: "Moderately Aggressive", "Conservative", etc.

### 5. Action Items (`_action_items`)
Specific, actionable recommendations:
```json
"_action_items": [
  "Start with SIP of ₹9,800/month",
  "Increase by 10% yearly every year",
  "Review annually and adjust based on goal progress"
]
```

### 6. Structured Asset Details
- `mappedMutualFunds`: Individual mutual fund schemes with full details
- `mappedStocks`: Individual stock holdings
- Both include scheme/stock names, values, and performance metrics

---

## Best Practices for CrewAI Integration

### 1. Use Summary Fields for Quick Context

```python
from crewai_tools import tool
import requests

@tool("Get User Goals Summary")
def get_user_goals_summary(user_id: str) -> str:
    """
    Retrieves a natural language summary of user's financial goals.
    Returns pre-formatted summary ready for LLM consumption.
    """
    response = requests.get(
        f"{API_BASE}/goals/user/{user_id}",
        headers={"X-AI-Coach-API-Key": API_KEY}
    )
    data = response.json()
    return data.get('_summary', 'No goals found')
```

### 2. Leverage Formatted Fields

Always use `_formatted` fields instead of calculating from raw numbers:

```python
@tool("Get Goal Progress")
def get_goal_progress(goal_id: str) -> dict:
    """Get goal progress with human-readable values"""
    response = requests.get(
        f"{API_BASE}/goals/{goal_id}/details",
        headers={"X-AI-Coach-API-Key": API_KEY}
    )
    data = response.json()
    goal = data['data']
    
    return {
        'summary': data['_summary'],
        'target': goal['target_amount_formatted'],
        'current': goal['current_amount_formatted'],
        'progress': goal['progress_description']
    }
```

### 3. Use Interpretation Fields for Recommendations

Pre-calculated interpretations reduce LLM computation:

```python
@tool("Assess Goal Performance")
def assess_goal_performance(goal_id: str) -> str:
    """Assess goal XIRR performance"""
    response = requests.get(
        f"{API_BASE}/goals/{goal_id}/xirr",
        headers={"X-AI-Coach-API-Key": API_KEY}
    )
    data = response.json()
    xirr_data = data['data']
    
    # Use pre-calculated interpretation
    return f"{xirr_data['xirr_interpretation']}. {xirr_data['comparison_context']}"
```

### 4. Use Action Items Directly

For simulation results, use action items:

```python
@tool("Get SIP Recommendations")
def get_sip_recommendations(target_amount: float, months: int, xirr: float) -> list:
    """Get recommended SIP strategy with action items"""
    response = requests.post(
        f"{API_BASE}/simulate",
        headers={"X-AI-Coach-API-Key": API_KEY},
        json={
            "targetAmount": target_amount,
            "months": months,
            "xirrPercent": xirr,
            "includeScenarios": True
        }
    )
    data = response.json()
    
    # Return action items directly
    return data['data'].get('_action_items', [])
```

### 5. Access Individual Asset Details

Use `mappedMutualFunds` and `mappedStocks` for detailed analysis:

```python
@tool("Analyze Goal Asset Mix")
def analyze_goal_assets(goal_id: str) -> str:
    """Analyze individual assets mapped to a goal"""
    response = requests.get(
        f"{API_BASE}/goals/{goal_id}/details",
        headers={"X-AI-Coach-API-Key": API_KEY}
    )
    data = response.json()
    goal = data['data']
    
    analysis = f"Goal has {goal.get('mappedMutualFunds', [])} mutual funds"
    
    if goal.get('mappedMutualFunds'):
        for mf in goal['mappedMutualFunds']:
            analysis += f"\n- {mf['scheme_name']}: {mf['current_value_formatted']} ({mf['return_percentage']}% return)"
    
    return analysis
```

---

## Complete CrewAI Tool Examples

### Example 1: Comprehensive Goal Analysis Tool

```python
from crewai_tools import tool
import requests

API_BASE = "https://your-portfolio-tracker.vercel.app/api/ai-coach"
API_KEY = os.getenv("PORTFOLIO_API_KEY")

@tool("Analyze User Financial Goals")
def analyze_user_goals(user_id: str) -> dict:
    """
    Comprehensive analysis of user's financial goals including progress,
    XIRR, asset allocation, and individual fund details.
    Returns structured data for LLM analysis.
    """
    goals_response = requests.get(
        f"{API_BASE}/goals/user/{user_id}",
        headers={"X-AI-Coach-API-Key": API_KEY}
    )
    
    goals_data = goals_response.json()
    
    return {
        'summary': goals_data['_summary'],
        'total_goals': goals_data['data']['total_goals'],
        'goals': goals_data['data']['goals']
    }
```

### Example 2: Goal Recommendation Tool

```python
@tool("Recommend SIP Strategy")
def recommend_sip_strategy(
    goal_id: str,
    target_amount: float,
    months: int,
    expected_return: float = 12.0
) -> dict:
    """
    Calculate and recommend optimal SIP strategy for a goal.
    Returns multiple scenarios with best recommendation.
    """
    response = requests.post(
        f"{API_BASE}/simulate",
        headers={"X-AI-Coach-API-Key": API_KEY},
        json={
            "goalId": goal_id,
            "targetAmount": target_amount,
            "months": months,
            "xirrPercent": expected_return,
            "includeScenarios": True
        }
    )
    
    data = response.json()
    
    return {
        'summary': data['_summary'],
        'recommended_sip': data['data']['best_scenario'],
        'action_items': data['data'].get('_action_items', []),
        'scenarios': data['data'].get('scenarios', [])
    }
```

### Example 3: Portfolio Health Check Tool

```python
@tool("Check Portfolio Health")
def check_portfolio_health(user_id: str) -> dict:
    """
    Assess overall portfolio health including allocation, XIRR, and risk profile.
    """
    allocation_response = requests.get(
        f"{API_BASE}/portfolio/{user_id}/allocation",
        headers={"X-AI-Coach-API-Key": API_KEY}
    )
    
    xirr_response = requests.get(
        f"{API_BASE}/portfolio/{user_id}/xirr",
        headers={"X-AI-Coach-API-Key": API_KEY}
    )
    
    allocation = allocation_response.json()['data']
    xirr = xirr_response.json()['data']
    
    return {
        'risk_profile': allocation['risk_profile'],
        'portfolio_health': xirr['portfolio_health'],
        'overall_xirr': xirr['overall']['formattedXIRR'],
        'diversification': allocation['diversification_score'],
        'rebalancing_suggestion': allocation.get('rebalancing_suggestion')
    }
```

---

## Rate Limiting

**Recommended:** Implement rate limiting on the AI-Coach side:
- Limit: 100 requests per minute per API key
- Implement exponential backoff on 429 responses (if added in future)
- Cache responses when appropriate (goals data changes infrequently)

---

## Response Structure Reference

All successful responses follow this structure:

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "_summary": "Natural language summary",
  "timestamp": "ISO 8601 timestamp",
  "_metadata": {
    "currency": "INR",
    "units": "Indian Rupees",
    "timestamp": "ISO 8601 timestamp",
    "dataFreshness": "real-time"
  }
}
```

All error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "ISO 8601 timestamp"
}
```

---

## Field Reference Guide

### Currency Formatting
- `₹` prefix always included
- Indian notation: L (Lakhs) for 100,000+, Cr (Crores) for 10,000,000+
- Examples: "₹5.2L", "₹1.5Cr", "₹12,500"

### Percentage Formatting
- Always includes `+` or `-` sign
- Two decimal places
- Examples: "+12.30%", "-5.25%", "+0.00%"

### Duration Formatting
- Years: `yr`, Months: `m`
- Examples: "5yr 3m", "10yr", "6m"

### Date Formatting
- Includes relative context
- Examples: "Dec 2030 (5yr 3m away)", "02/11/2024"

### Fund Facts Fields
- `provenance`: `"llm+cited"` when enriched data passes guardrails or `"deterministic"` when only baseline data is available.
- `llm_confidence`: `"high"` or `"medium"`; omitted for deterministic responses.
- `llm_as_of`: ISO date describing the freshest performance/risk metrics surfaced to the LLM.
- `sources`: Up to 3 cited URLs with `field`-level granularity and `as_of` dates so CrewAI agents can mention provenance.
- `notes.llm`: Human-readable explanation for fallbacks (e.g., confidence too low, guardrail failure, LLM disabled).

---

## Testing the API

See `TEST_AI_COACH_API.md` for comprehensive testing guide including:
- cURL examples
- PowerShell scripts
- Node.js test scripts
- Postman collection setup

---

## Support

For issues or questions:
- Check `TEST_AI_COACH_API.md` for common issues
- Verify API key is set correctly
- Ensure UUID formats are correct
- Review error messages for specific validation failures

**Last Updated:** November 2024
