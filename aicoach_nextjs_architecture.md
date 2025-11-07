# AI Coach — Next.js Integration Architecture

**Project**: Portfolio Tracker (sipgoals)  
**Location**: Next.js project on Vercel  
**Purpose**: Integration layer between Next.js frontend and CrewAI service

This document provides complete architecture for integrating the AI Coach into the existing Next.js portfolio tracker application. The Next.js app acts as a façade layer, handling authentication, session management, and streaming results from the separate CrewAI service.

---

## 0. High-Level Architecture

```
[ Browser / React UI ]
        │
        ▼
[ Next.js API Routes (app/api/ai/coach/*) ]
        │
        ├─── Auth Check (Supabase Session)
        ├─── HTTP ────────────────▶ [ CrewAI Service on Railway/Render ]
        │                                    │
        │                                    ├─── Agents analyze portfolio
        │                                    ├─── Write insights to Supabase
        │                                    └─── Stream results back
        │
        ├─── SSE ─────────────────────────▶ [ CrewAI Service (SSE endpoint) ]
        │
        ▼
[ Supabase Database ]
   ├─── ai_sessions
   ├─── ai_insights
   ├─── ai_recommendations
   └─── ai_events
```

**Key Responsibilities:**
- **Next.js API**: Authentication, session management, HTTP client to CrewAI service, SSE proxy
- **CrewAI Service**: Multi-agent orchestration, portfolio analysis, LLM interactions
- **Supabase**: Shared database for both services

---

## 1. Folder Structure

```
portfolio-tracker/
├─ app/
│  ├─ dashboard/
│  │  └─ ai-coach/
│  │     ├─ page.tsx                    # Coach hub page (feed + actions)
│  │     └─ components/
│  │        ├─ InsightCard.tsx         # Display individual insights
│  │        ├─ RecommendationCard.tsx   # Display recommendations
│  │        ├─ AllocationHealth.tsx     # Asset allocation widget
│  │        ├─ GoalProgressCoach.tsx    # Goal progress widget
│  │        ├─ CoachSessionConsole.tsx  # Live SSE console
│  │        └─ CoachFeed.tsx            # Main feed component
│  │
│  └─ api/
│     ├─ ai/
│     │  └─ coach/
│     │     ├─ start/route.ts           # POST: Start coaching session
│     │     ├─ stream/route.ts          # GET: SSE stream proxy
│     │     ├─ insights/route.ts        # GET: Fetch stored insights
│     │     ├─ recommendations/route.ts # GET: Fetch recommendations
│     │     ├─ feedback/route.ts       # POST: User feedback
│     │     └─ webhook/route.ts         # POST: Vercel cron webhook
│     │
│     └─ coach-utils/                    # Utility APIs for CrewAI service
│        ├─ portfolio/route.ts           # GET: Portfolio data for user
│        ├─ goals/route.ts                # GET: Goals with progress
│        ├─ xirr/route.ts                # GET: XIRR for goal/portfolio
│        └─ goal-simulation/route.ts    # POST: Goal simulation calculations
│
├─ lib/
│  ├─ supabaseClient.ts                 # (existing) Supabase client
│  ├─ portfolioUtils.ts                 # (existing) Portfolio functions
│  ├─ goalSimulator.ts                  # (existing) Goal calculations
│  └─ coach/
│     ├─ client.ts                      # HTTP client for CrewAI service
│     ├─ types.ts                       # TypeScript types & Zod schemas
│     └─ utils.ts                       # Helper functions
│
├─ components/
│  └─ (existing components remain)
│
├─ supabase/
│  └─ migrations/
│     └─ 20250101_ai_coach_core.sql     # AI tables schema
│
└─ vercel.json                          # (update) Add cron for webhook
```

---

## 2. Environment Variables

Add to `.env.local`:

```bash
# Existing Supabase vars
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# CrewAI Service Configuration
CREWAI_SERVICE_URL=https://your-crewai-service.railway.app
CREWAI_API_KEY=your_service_api_key  # For authentication with CrewAI service

# Next.js Utility APIs (for CrewAI to call back)
CREWAI_SERVICE_API_KEY=shared_secret_key  # Same key used by CrewAI to authenticate with Next.js utility APIs
NEXTJS_BASE_URL=https://your-nextjs-app.vercel.app  # For CrewAI to call utility APIs

# Optional: KV for session state (if needed)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

---

## 3. Database Schema (Supabase)

Run migration: `supabase/migrations/20250101_ai_coach_core.sql`

```sql
-- AI Coaching Sessions
CREATE TABLE ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trigger text NOT NULL, -- 'on_demand', 'post_ingest', 'daily', 'weekly'
  status text NOT NULL DEFAULT 'running', -- 'running', 'succeeded', 'failed'
  started_at timestamptz DEFAULT NOW() NOT NULL,
  ended_at timestamptz,
  summary text,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

-- AI Events (streaming events during session)
CREATE TABLE ai_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES ai_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phase text NOT NULL, -- 'started', 'agent_running', 'insight_generated', 'completed'
  kind text NOT NULL, -- 'status', 'insight', 'recommendation', 'error'
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

-- AI Insights (analysis results)
CREATE TABLE ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES ai_sessions(id) ON DELETE CASCADE,
  scope text NOT NULL, -- 'performance', 'allocation', 'goals', 'risk'
  title text NOT NULL,
  body_md text NOT NULL,
  data jsonb, -- Structured data used to generate insight
  created_at timestamptz DEFAULT NOW() NOT NULL
);

-- AI Recommendations (actionable suggestions)
CREATE TABLE ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES ai_sessions(id) ON DELETE CASCADE,
  kind text NOT NULL, -- 'rebalance', 'increase_investment', 'diversify', 'tax_optimize'
  rationale_md text NOT NULL,
  actions_json jsonb NOT NULL, -- Array of specific actions
  status text DEFAULT 'proposed', -- 'proposed', 'accepted', 'dismissed'
  created_at timestamptz DEFAULT NOW() NOT NULL
);

-- Topic Ledger (prevent duplicate insights)
CREATE TABLE ai_topic_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_key text NOT NULL, -- e.g., 'performance_2024_q1', 'allocation_equity_drift'
  last_seen_at timestamptz DEFAULT NOW() NOT NULL,
  metadata jsonb,
  UNIQUE(user_id, topic_key)
);

-- User Preferences for AI Coach
CREATE TABLE ai_user_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tone text DEFAULT 'professional', -- 'professional', 'friendly', 'concise'
  risk_profile text, -- 'conservative', 'moderate', 'aggressive'
  notify_email boolean DEFAULT false,
  notify_push boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id)
);

-- RLS Policies
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_topic_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_prefs ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own sessions"
  ON ai_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own events"
  ON ai_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own insights"
  ON ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendations"
  ON ai_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own topic ledger"
  ON ai_topic_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own prefs"
  ON ai_user_prefs FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_sessions_user_id ON ai_sessions(user_id);
CREATE INDEX idx_ai_sessions_status ON ai_sessions(status);
CREATE INDEX idx_ai_events_session_id ON ai_events(session_id);
CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX idx_ai_topic_ledger_user_id ON ai_topic_ledger(user_id);
```

---

## 4. API Endpoints

### 4.0 Utility APIs for CrewAI Service

These endpoints are called by the CrewAI service to access calculation utilities.

#### 4.0.1 GET `/app/api/coach-utils/portfolio`

**Purpose**: Get portfolio summary and holdings for a user

**Authentication**: API key via `X-API-Key` header (service-to-service)

**Request:**
```
GET /app/api/coach-utils/portfolio?userId=uuid
Headers:
  X-API-Key: CREWAI_SERVICE_API_KEY
```

**Response:**
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
    current_value: number
    total_invested: number
    return_amount: number
    // ... other fields
  }>
}
```

#### 4.0.2 GET `/app/api/coach-utils/goals`

**Purpose**: Get all goals with progress and details

**Request:**
```
GET /app/api/coach-utils/goals?userId=uuid
```

**Response:**
```typescript
{
  goals: Array<{
    id: string
    name: string
    target_amount: number
    current_amount: number
    target_date: string
    progress_percentage: number
    // ... other fields
  }>
}
```

#### 4.0.3 GET `/app/api/coach-utils/xirr`

**Purpose**: Get XIRR calculation for a goal or portfolio

**Request:**
```
GET /app/api/coach-utils/xirr?goalId=uuid
GET /app/api/coach-utils/xirr?userId=uuid (portfolio XIRR)
```

**Response:**
```typescript
{
  xirr: number
  xirrPercentage: number
  formattedXIRR: string
  converged: boolean
  current_value: number
  error?: string
}
```

#### 4.0.4 POST `/app/api/coach-utils/goal-simulation`

**Purpose**: Perform goal simulation calculations (reuses existing `/api/simulate-goal` logic)

**Request:**
```typescript
{
  goalId?: string
  monthlySIP?: number
  xirr?: number
  stepUp?: number
  targetAmount?: number
  months?: number
  existingCorpus?: number
}
```

**Response:**
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
    monthlySIP: number
    // ... other fields
  }
}
```

**Implementation Example:**
```typescript
// app/api/coach-utils/portfolio/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPortfolioSummary, getCurrentPortfolio } from '@/lib/portfolioUtils'

export async function GET(request: NextRequest) {
  // 1. Verify API key (service-to-service auth)
  const apiKey = request.headers.get('X-API-Key')
  if (apiKey !== process.env.CREWAI_SERVICE_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get userId from query params
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  // 3. Fetch data using existing utilities
  const portfolio = await getCurrentPortfolio(userId)
  const summary = await getPortfolioSummary(userId)

  return NextResponse.json({ portfolio: summary, holdings: portfolio })
}
```

---

### 4.1 POST `/app/api/ai/coach/start`

**Purpose**: Start a new coaching session

**Request:**
```typescript
POST /app/api/ai/coach/start
Headers:
  Cookie: (Supabase session cookie)
Body:
{
  trigger?: 'on_demand' | 'post_ingest',
  focus?: string[] // ['performance', 'allocation', 'goals']
}
```

**Response:**
```typescript
{
  sessionId: string
  status: 'running'
  streamUrl: string // `/app/api/ai/coach/stream?sessionId=...`
}
```

**Implementation:**
```typescript
// app/api/ai/coach/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { coachClient } from '@/lib/coach/client'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (!session || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 2. Parse request body
    const body = await request.json()
    const trigger = body.trigger || 'on_demand'
    const focus = body.focus || ['performance', 'allocation', 'goals']

    // 3. Create session in database
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: dbSession, error: dbError } = await supabaseServer
      .from('ai_sessions')
      .insert({
        user_id: userId,
        trigger,
        status: 'running'
      })
      .select()
      .single()

    if (dbError || !dbSession) {
      console.error('Error creating session:', dbError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // 4. Call CrewAI service to start analysis
    const crewAISession = await coachClient.startSession({
      sessionId: dbSession.id,
      userId,
      trigger,
      focus
    })

    if (!crewAISession.success) {
      // Update session status to failed
      await supabaseServer
        .from('ai_sessions')
        .update({ status: 'failed', ended_at: new Date().toISOString() })
        .eq('id', dbSession.id)

      return NextResponse.json(
        { error: crewAISession.error || 'Failed to start analysis' },
        { status: 500 }
      )
    }

    // 5. Return session info
    return NextResponse.json({
      sessionId: dbSession.id,
      status: 'running',
      streamUrl: `/app/api/ai/coach/stream?sessionId=${dbSession.id}`
    })

  } catch (error) {
    console.error('Error in start endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 4.2 GET `/app/api/ai/coach/stream`

**Purpose**: SSE stream of coaching session progress

**Request:**
```
GET /app/api/ai/coach/stream?sessionId=uuid
Headers:
  Cookie: (Supabase session cookie)
```

**Response:**
```
Content-Type: text/event-stream

event: status
data: {"type":"status","phase":"started","message":"Analysis started"}

event: insight
data: {"type":"insight","scope":"performance","title":"...","body":"..."}

event: recommendation
data: {"type":"recommendation","kind":"rebalance","rationale":"..."}

event: complete
data: {"type":"complete","status":"succeeded"}
```

**Implementation:**
```typescript
// app/api/ai/coach/stream/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  // 1. Verify authentication
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  if (!session || authError) {
    return new Response('Unauthorized', { status: 401 })
  }

  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 })
  }

  // 2. Verify session belongs to user
  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: dbSession } = await supabaseServer
    .from('ai_sessions')
    .select('user_id, status')
    .eq('id', sessionId)
    .single()

  if (!dbSession || dbSession.user_id !== session.user.id) {
    return new Response('Session not found', { status: 404 })
  }

  // 3. Create SSE stream that proxies from CrewAI service
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Call CrewAI service stream endpoint
        const crewAIResponse = await fetch(
          `${process.env.CREWAI_SERVICE_URL}/stream?sessionId=${sessionId}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.CREWAI_API_KEY}`
            }
          }
        )

        if (!crewAIResponse.ok) {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
          )
          controller.close()
          return
        }

        const reader = crewAIResponse.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        // Proxy SSE events
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          controller.enqueue(value)
        }

        controller.close()
      } catch (error) {
        console.error('Stream error:', error)
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
        )
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

### 4.3 GET `/app/api/ai/coach/insights`

**Purpose**: Fetch stored insights for user

**Request:**
```
GET /app/api/ai/coach/insights?limit=10&scope=performance
```

**Response:**
```typescript
{
  insights: Array<{
    id: string
    scope: string
    title: string
    body_md: string
    data: any
    created_at: string
  }>
}
```

### 4.4 GET `/app/api/ai/coach/recommendations`

**Purpose**: Fetch stored recommendations

**Request:**
```
GET /app/api/ai/coach/recommendations?limit=10
```

### 4.5 POST `/app/api/ai/coach/feedback`

**Purpose**: Submit user feedback on insights/recommendations

**Request:**
```typescript
{
  insightId?: string
  recommendationId?: string
  feedback: 'positive' | 'negative'
  comment?: string
}
```

### 4.6 POST `/app/api/ai/coach/webhook`

**Purpose**: Vercel cron endpoint to trigger scheduled coaching

**Request:**
```
POST /app/api/ai/coach/webhook?job=daily
Headers:
  Authorization: Bearer ${CRON_SECRET}
```

---

## 5. Library Functions

### 5.1 `lib/coach/client.ts`

HTTP client for CrewAI service communication:

```typescript
// lib/coach/client.ts
const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL!
const CREWAI_API_KEY = process.env.CREWAI_API_KEY!

export interface StartSessionRequest {
  sessionId: string
  userId: string
  trigger: string
  focus: string[]
}

export interface StartSessionResponse {
  success: boolean
  error?: string
}

export const coachClient = {
  async startSession(req: StartSessionRequest): Promise<StartSessionResponse> {
    const response = await fetch(`${CREWAI_SERVICE_URL}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CREWAI_API_KEY}`
      },
      body: JSON.stringify(req)
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  }
}
```

### 5.2 `lib/coach/types.ts`

TypeScript types and Zod schemas:

```typescript
// lib/coach/types.ts
import { z } from 'zod'

export const InsightSchema = z.object({
  scope: z.enum(['performance', 'allocation', 'goals', 'risk']),
  title: z.string(),
  body_md: z.string(),
  data: z.record(z.any()).optional()
})

export const RecommendationSchema = z.object({
  kind: z.enum(['rebalance', 'increase_investment', 'diversify', 'tax_optimize']),
  rationale_md: z.string(),
  actions_json: z.array(z.any())
})

export type Insight = z.infer<typeof InsightSchema>
export type Recommendation = z.infer<typeof RecommendationSchema>
```

---

## 6. Frontend Components

### 6.1 Coach Hub Page

```typescript
// app/dashboard/ai-coach/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import CoachFeed from './components/CoachFeed'
import CoachSessionConsole from './components/CoachSessionConsole'

export default function AICoachPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)

  const startCoaching = async () => {
    const response = await fetch('/app/api/ai/coach/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'on_demand' })
    })

    const { sessionId } = await response.json()
    setSessionId(sessionId)
  }

  return (
    <div className="container mx-auto p-6">
      <h1>AI Investment Coach</h1>
      
      <button onClick={startCoaching}>
        Run Analysis
      </button>

      {sessionId && (
        <CoachSessionConsole sessionId={sessionId} />
      )}

      <CoachFeed />
    </div>
  )
}
```

### 6.2 SSE Console Component

```typescript
// app/dashboard/ai-coach/components/CoachSessionConsole.tsx
'use client'

import { useEffect, useState } from 'react'

export default function CoachSessionConsole({ sessionId }: { sessionId: string }) {
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    const eventSource = new EventSource(`/app/api/ai/coach/stream?sessionId=${sessionId}`)

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setEvents(prev => [...prev, data])
    }

    eventSource.addEventListener('insight', (e) => {
      const data = JSON.parse(e.data)
      setEvents(prev => [...prev, data])
    })

    eventSource.addEventListener('complete', () => {
      eventSource.close()
    })

    return () => eventSource.close()
  }, [sessionId])

  return (
    <div className="border p-4">
      <h3>Live Session</h3>
      {events.map((event, i) => (
        <div key={i}>{JSON.stringify(event)}</div>
      ))}
    </div>
  )
}
```

---

## 7. Error Handling

- **Authentication failures**: Return 401, redirect to login
- **CrewAI service unavailable**: Return 503, show retry option
- **Session not found**: Return 404
- **Stream errors**: Close connection gracefully, show error message
- **Rate limiting**: Return 429, implement exponential backoff

---

## 8. Security Considerations

1. **Authentication**: All endpoints verify Supabase session
2. **Authorization**: RLS policies ensure users only access their data
3. **API Key**: CrewAI service API key stored in env, never exposed to client
4. **Input Validation**: Use Zod schemas to validate all inputs
5. **PII Protection**: Never send sensitive data (folio numbers) to CrewAI service

---

## 9. Testing Strategy

1. **Unit Tests**: Test client functions, type validations
2. **Integration Tests**: Test API endpoints with mock CrewAI service
3. **E2E Tests**: Test full flow: start → stream → display insights
4. **Load Tests**: Test SSE stream stability under load

---

## 10. Deployment Checklist

- [ ] Add environment variables to Vercel
- [ ] Run database migration in Supabase
- [ ] Test CrewAI service connectivity
- [ ] Verify RLS policies
- [ ] Test SSE streaming
- [ ] Set up error monitoring (Sentry)
- [ ] Configure cron job in vercel.json

---

**End of Next.js Architecture Document**


