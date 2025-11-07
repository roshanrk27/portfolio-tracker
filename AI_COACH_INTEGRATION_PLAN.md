# AI Coach Integration Plan - Detailed Approach

## Executive Summary

**Recommendation**: Expose portfolio calculation utilities as REST APIs that the CrewAI service calls (same project or separate service).

**Key Benefits**:
1. ✅ Reuse existing battle-tested calculation logic
2. ✅ Single source of truth for business logic
3. ✅ AI coach service remains lightweight
4. ✅ Easy to maintain and extend
5. ✅ No code duplication

---

## Architecture Decision: **Same vs Separate Service**

### Option A: Same Next.js Project (Vercel Functions)

**Pros:**
- Single deployment
- Shared environment variables
- No network overhead
- Simpler deployment

**Cons:**
- Vercel Python runtime limitations
- Can't scale AI service independently
- Longer cold starts for Python functions

### Option B: Separate Service (Railway/Render) + Utility APIs

**Pros:**
- Independent scaling
- Better Python runtime support
- Can use Python-specific AI frameworks easily
- Clear separation of concerns

**Cons:**
- Two deployments to manage
- Network latency for API calls
- Shared secrets management

**RECOMMENDATION**: **Option B** - Separate service approach
- Your architecture docs already outline this approach
- Better for long-term scalability
- Allows Python-first development for AI logic

---

## Implementation Approach: REST API Layer

### Overview

Instead of duplicating logic in Python, create **utility API endpoints** in your Next.js app that your AI coach service calls via HTTP.

```
[ Next.js Portfolio Tracker ]
├─ lib/portfolioUtils.ts (existing calculations)
├─ lib/xirr.ts (XIRR math)
├─ lib/goalSimulator.ts (goal projections)
└─ app/api/coach-utils/* (NEW: API endpoints)

                HTTP Requests ▼

[ CrewAI Service (Railway/Render) ]
├─ Tools call Next.js utility APIs
└─ Agents use calculation results
```

---

## Phase 1: Create Utility API Endpoints

### New API Routes to Create

#### 1. Portfolio Data API
**File**: `app/api/coach-utils/portfolio/route.ts`

**Purpose**: Get portfolio summary and holdings for analysis

**Endpoint**: `GET /api/coach-utils/portfolio?userId={userId}`

**Authentication**: API Key header (`X-API-Key`)

**Response**:
```typescript
{
  portfolio: {
    totalHoldings: number
    totalInvested: number
    totalCurrentValue: number
    totalReturn: number
    totalReturnPercentage: number
  }
  holdings: Array<{
    scheme_name: string
    folio: string
    current_value: number
    total_invested: number
    return_amount: number
    return_percentage: number
    current_nav: number
    latest_unit_balance: number
  }>
}
```

**Implementation**: Calls `getPortfolioSummary()` + `getCurrentPortfolio()` from `portfolioUtils.ts`

---

#### 2. Goals Data API
**File**: `app/api/coach-utils/goals/route.ts`

**Purpose**: Get all goals with progress, mappings, and current values

**Endpoint**: `GET /api/coach-utils/goals?userId={userId}`

**Response**:
```typescript
{
  goals: Array<{
    id: string
    name: string
    description: string
    target_amount: number
    target_date: string
    current_amount: number
    progress_percentage: number
    days_remaining: number
    mutual_fund_value: number
    stock_value: number
    nps_value: number
    mappedAssets: Array<{
      type: 'mutual_fund' | 'stock' | 'nps'
      scheme_name?: string
      stock_code?: string
      nps_fund_code?: string
      current_value: number
    }>
  }>
}
```

**Implementation**: Calls `fetchGoalsWithDetails()` from `portfolioUtils.ts`

---

#### 3. XIRR Calculation API
**File**: `app/api/coach-utils/xirr/route.ts`

**Purpose**: Get XIRR for portfolio, schemes, or specific goals

**Endpoint**: 
- `GET /api/coach-utils/xirr?userId={userId}` (portfolio XIRR)
- `GET /api/coach-utils/xirr?userId={userId}&schemeName={name}` (scheme XIRR)
- `GET /api/coach-utils/xirr?goalId={goalId}` (goal XIRR)

**Response**:
```typescript
{
  xirr: number
  xirrPercentage: number
  formattedXIRR: string
  converged: boolean
  error?: string
  current_value: number
  total_invested: number
  return_amount: number
}
```

**Implementation**: 
- Calls `getPortfolioXIRR()` for userId-only
- Calls `getSchemeXIRRs()` filtered by schemeName
- Calls `getGoalXIRR()` for goalId

---

#### 4. Goal Simulation API
**File**: `app/api/coach-utils/goal-simulation/route.ts`

**Purpose**: Run goal projection calculations with various scenarios

**Endpoint**: `POST /api/coach-utils/goal-simulation`

**Request Body**:
```typescript
{
  goalId?: string           // Optional: pre-fill from existing goal
  monthlySIP?: number
  xirr?: number
  stepUpPercent?: number
  targetAmount?: number
  months?: number
  existingCorpus?: number
}
```

**Response**:
```typescript
{
  projection: Array<{
    date: string
    corpus: number
    months: number
  }>
  summary: {
    finalCorpus: number
    totalMonths: number
    totalInvested: number
    estimatedReturns: number
  }
  scenarios?: Array<{
    stepUpPercent: number
    monthlySIP: number
    finalCorpus: number
  }>
}
```

**Implementation**: 
- If `goalId` provided: fetches goal data, uses current XIRR/progress
- Calls `calculateCorpus()`, `calculateRequiredMonthlySIP()`, `generateStepUpScenarios()` from `goalSimulator.ts`

---

#### 5. Allocation Analysis API
**File**: `app/api/coach-utils/allocation/route.ts`

**Purpose**: Get asset allocation breakdown for portfolio analysis

**Endpoint**: `GET /api/coach-utils/allocation?userId={userId}`

**Response**:
```typescript
{
  allocation: {
    equity: { value: number, percentage: number }
    debt: { value: number, percentage: number }
    hybrid: { value: number, percentage: number }
    others: { value: number, percentage: number }
  }
  byCategory: Array<{
    category: string
    value: number
    percentage: number
    schemes: string[]
  }>
  recommendation?: {
    suggested_allocation: Record<string, number>
    drift: Record<string, number>
  }
}
```

**Implementation**: Uses `calculateAssetAllocation()` from `assetAllocation.ts`

---

### Authentication & Security

**Shared Secret Approach**: Use API key authentication

#### 1. Environment Variables

Add to `.env.local`:
```bash
# Shared secret between Next.js and CrewAI service
CREWAI_SERVICE_API_KEY=your_secure_random_key_here_min_32_chars
```

#### 2. Middleware Function

Create `lib/api-auth.ts`:
```typescript
export function verifyApiKey(request: Request): boolean {
  const apiKey = request.headers.get('X-API-Key')
  return apiKey === process.env.CREWAI_SERVICE_API_KEY
}

export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }), 
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
}
```

#### 3. Use in All Routes

```typescript
// Example: app/api/coach-utils/portfolio/route.ts
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth'

export async function GET(request: Request) {
  if (!verifyApiKey(request)) {
    return unauthorizedResponse()
  }
  
  // ... rest of implementation
}
```

---

## Phase 2: CrewAI Service Integration

### Python HTTP Client

Create `tools/nextjs_client.py` in your CrewAI service:

```python
import httpx
import os
from typing import Dict, Any, Optional

class NextJSClient:
    def __init__(self):
        self.base_url = os.getenv("NEXTJS_BASE_URL")
        self.api_key = os.getenv("NEXTJS_API_KEY")
        
    def _headers(self) -> Dict[str, str]:
        return {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def get_portfolio(self, user_id: str) -> Dict[str, Any]:
        """Get portfolio summary and holdings"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/coach-utils/portfolio",
                params={"userId": user_id},
                headers=self._headers(),
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def get_goals(self, user_id: str) -> list[Dict[str, Any]]:
        """Get all goals with progress"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/coach-utils/goals",
                params={"userId": user_id},
                headers=self._headers(),
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("goals", [])
    
    async def get_goal_xirr(self, goal_id: str) -> Dict[str, Any]:
        """Get XIRR calculation for a goal"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/coach-utils/xirr",
                params={"goalId": goal_id},
                headers=self._headers(),
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def simulate_goal(
        self,
        goal_id: Optional[str] = None,
        monthly_sip: Optional[float] = None,
        xirr: Optional[float] = None,
        step_up: Optional[float] = None,
        target_amount: Optional[float] = None,
        months: Optional[int] = None,
        existing_corpus: Optional[float] = None
    ) -> Dict[str, Any]:
        """Run goal simulation calculation"""
        payload = {}
        if goal_id: payload["goalId"] = goal_id
        if monthly_sip: payload["monthlySIP"] = monthly_sip
        if xirr: payload["xirr"] = xirr
        if step_up: payload["stepUpPercent"] = step_up
        if target_amount: payload["targetAmount"] = target_amount
        if months: payload["months"] = months
        if existing_corpus: payload["existingCorpus"] = existing_corpus
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/coach-utils/goal-simulation",
                json=payload,
                headers=self._headers(),
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()

# Singleton instance
nextjs_client = NextJSClient()
```

### CrewAI Tools

Create `tools/portfolio_reader.py`:

```python
from crewai_tools import tool
from tools.nextjs_client import nextjs_client
from typing import Dict, Any

@tool("portfolio_reader")
def portfolio_reader_tool(user_id: str) -> Dict[str, Any]:
    """
    Read user portfolio data including holdings, values, and returns.
    
    Args:
        user_id: User ID to fetch portfolio for
    
    Returns:
        Portfolio data with summary and detailed holdings
    """
    # PII scrubbing happens in Next.js layer
    return nextjs_client.get_portfolio(user_id)
```

Create `tools/goal_math.py`:

```python
from crewai_tools import tool
from tools.nextjs_client import nextjs_client
from typing import Dict, Any

@tool("goal_math")
def goal_math_tool(
    user_id: str, 
    calculation_type: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Perform goal-related calculations.
    
    Args:
        user_id: User ID
        calculation_type: Type of calculation:
            - 'goals_list': Get all goals with progress
            - 'xirr': Get XIRR for a specific goal (requires goalId)
            - 'simulation': Run goal simulation (requires goalId + params)
    
    Returns:
        Calculation results
    """
    if calculation_type == 'goals_list':
        goals = nextjs_client.get_goals(user_id)
        return {"goals": goals}
    
    elif calculation_type == 'xirr':
        goal_id = kwargs.get('goal_id')
        if not goal_id:
            return {"error": "goal_id required for XIRR calculation"}
        return nextjs_client.get_goal_xirr(goal_id)
    
    elif calculation_type == 'simulation':
        goal_id = kwargs.get('goal_id')
        return nextjs_client.simulate_goal(
            goal_id=goal_id,
            monthly_sip=kwargs.get('monthly_sip'),
            xirr=kwargs.get('xirr'),
            step_up=kwargs.get('step_up'),
            target_amount=kwargs.get('target_amount'),
            months=kwargs.get('months'),
            existing_corpus=kwargs.get('existing_corpus')
        )
    else:
        return {"error": f"Unknown calculation type: {calculation_type}"}
```

---

## Phase 3: Additional Utilities

### 6. NAV Data API (Optional)
**File**: `app/api/coach-utils/nav/route.ts`

**Purpose**: Get latest NAV for schemes

**Endpoint**: `GET /api/coach-utils/nav?schemeName={name}`

---

### 7. Stock Prices API (Optional)
**File**: `app/api/coach-utils/stocks/route.ts`

**Purpose**: Get current stock prices

**Endpoint**: `POST /api/coach-utils/stocks` (body: `{ symbols: string[] }`)

---

### 8. Transactions API (Optional)
**File**: `app/api/coach-utils/transactions/route.ts`

**Purpose**: Get transaction history for analysis

**Endpoint**: `GET /api/coach-utils/transactions?userId={userId}&limit=100`

---

## Implementation Checklist

### Next.js Portfolio Tracker

- [ ] **Phase 1.1**: Create `lib/api-auth.ts` for API key verification
- [ ] **Phase 1.2**: Create `app/api/coach-utils/portfolio/route.ts`
- [ ] **Phase 1.3**: Create `app/api/coach-utils/goals/route.ts`
- [ ] **Phase 1.4**: Create `app/api/coach-utils/xirr/route.ts`
- [ ] **Phase 1.5**: Create `app/api/coach-utils/goal-simulation/route.ts`
- [ ] **Phase 1.6**: Create `app/api/coach-utils/allocation/route.ts`
- [ ] **Phase 1.7**: Add `CREWAI_SERVICE_API_KEY` to environment variables
- [ ] **Phase 1.8**: Test all endpoints with Postman/curl
- [ ] **Phase 1.9**: Add error handling and logging

### CrewAI Service

- [ ] **Phase 2.1**: Create `tools/nextjs_client.py`
- [ ] **Phase 2.2**: Create `tools/portfolio_reader.py`
- [ ] **Phase 2.3**: Create `tools/goal_math.py`
- [ ] **Phase 2.4**: Configure `NEXTJS_BASE_URL` and `NEXTJS_API_KEY`
- [ ] **Phase 2.5**: Update agent definitions to use new tools
- [ ] **Phase 2.6**: Test tool calls from agents
- [ ] **Phase 2.7**: Add retry logic and error handling

---

## Example Agent Usage

### Performance Agent

```python
from crewai import Agent
from tools.portfolio_reader import portfolio_reader_tool
from tools.goal_math import goal_math_tool

performance_agent = Agent(
    role="Performance Analyst",
    goal="Analyze portfolio performance and provide insights",
    backstory="You are an expert financial analyst",
    tools=[portfolio_reader_tool, goal_math_tool],
    verbose=True
)

# Agent can now:
# 1. portfolio_reader_tool(user_id="...") → Get portfolio data
# 2. goal_math_tool(user_id="...", calculation_type="xirr", goal_id="...") → Get XIRR
# 3. goal_math_tool(user_id="...", calculation_type="simulation", ...) → Run projections
```

---

## Security Considerations

### 1. API Key Management
- ✅ Generate strong random key (>32 chars)
- ✅ Store in environment variables (never commit)
- ✅ Rotate periodically
- ✅ Use different keys for dev/prod

### 2. Rate Limiting
- Add rate limiting to utility API endpoints
- Prevent abuse from service calls

### 3. PII Scrubbing
- ✅ Folio numbers should NOT be returned to AI coach
- ✅ Use stable numeric IDs only
- ✅ No personally identifiable information in API responses

### 4. Error Handling
- Graceful degradation if CrewAI service is down
- Log all API calls for audit trail
- Return informative error messages

---

## Testing Strategy

### Unit Tests (Next.js)
- Test each API endpoint with valid/invalid inputs
- Verify authentication works correctly
- Test PII scrubbing

### Integration Tests (CrewAI)
- Test Python client against Next.js APIs
- Verify calculation accuracy matches expected results
- Test error handling scenarios

### E2E Tests
- Full workflow: CrewAI agent → Utility API → Response → Insight generation
- Verify data integrity across service boundaries

---

## Deployment

### Next.js (Vercel)
1. Deploy API endpoints
2. Set `CREWAI_SERVICE_API_KEY` in Vercel environment variables
3. Test endpoints are accessible

### CrewAI Service (Railway/Render)
1. Deploy service
2. Set `NEXTJS_BASE_URL` and `NEXTJS_API_KEY`
3. Test connectivity to Next.js APIs
4. Verify tool calls work from agents

---

## Monitoring & Observability

### Next.js
- Log all utility API calls with:
  - User ID
  - Endpoint called
  - Response time
  - Error status
- Set up alerts for:
  - High error rates
  - Slow response times
  - Unauthorized access attempts

### CrewAI Service
- Log all tool calls with:
  - Tool name
  - Parameters
  - Response
  - Latency
- Track:
  - API call success rates
  - Token usage
  - Agent execution times

---

## Future Enhancements

1. **Caching**: Add Redis caching for frequently accessed data
2. **GraphQL**: Convert to GraphQL for more flexible queries
3. **Webhooks**: Add webhooks to notify AI coach of data changes
4. **Batch Processing**: Support batch operations for efficiency
5. **Real-time**: Consider WebSockets for live data updates

---

## Cost Considerations

### Next.js API Routes (Vercel)
- Free tier: 100GB bandwidth/month
- Serverless function calls count against quota
- Consider edge caching for static responses

### CrewAI Service
- Railway/Render free tier should be sufficient for MVP
- Monitor Python runtime memory usage
- LLM API costs (OpenAI/Anthropic) will be main expense

---

## Conclusion

This approach provides:
- ✅ Clean separation of concerns
- ✅ Reusable utility functions
- ✅ Easy to maintain and extend
- ✅ Production-ready security
- ✅ Scalable architecture

**Next Steps**:
1. Start with Phase 1.1-1.5 (core utility APIs)
2. Test with Postman/curl
3. Build CrewAI service integration
4. Deploy and monitor

**Estimated Time**: 2-3 days for full implementation and testing.


