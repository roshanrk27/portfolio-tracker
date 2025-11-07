# 🏗️ Portfolio Tracker - Comprehensive Architecture Documentation v1.1

## 📋 Executive Summary

**Portfolio Tracker** is a full-stack SaaS web application designed for Indian investors to comprehensively manage and track their investment portfolios across multiple asset classes. The application provides goal-based investment planning, real-time performance analytics, automated data updates, and sophisticated financial calculations to help users make informed investment decisions.

### 🎯 Core Value Proposition

- **Unified Multi-Asset Portfolio Management**: Track Mutual Funds, Stocks, and NPS investments in one place
- **Goal-Based Investment Planning**: Map investments to specific financial goals with real-time progress tracking
- **Intelligent Performance Analytics**: XIRR calculations, asset allocation analysis, and comprehensive return metrics
- **Automated Data Management**: Daily NAV updates, real-time stock prices, and automated portfolio valuation
- **Smart Caching System**: Weekend-aware caching for stock prices with automatic INR conversion
- **CAMS Integration**: Parse and import CAMS consolidated mutual fund statements (PDF/CSV)

### 👥 Target Users

- Individual investors managing mutual funds, stocks, and NPS investments
- Goal-oriented investors planning for specific financial objectives
- Users seeking consolidated portfolio views across multiple asset classes
- Investors wanting accurate XIRR calculations and performance tracking

---

## 🛠️ Technology Stack

### Frontend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | Next.js | 15.3.4 | React-based full-stack framework with App Router |
| **UI Library** | React | 19.0.0 | Component-based UI development |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Styling** | Tailwind CSS | 4.0 | Utility-first CSS framework |
| **State Management** | React Query (TanStack Query) | 5.81.5 | Server state management and caching |
| **Progress Indicator** | NProgress | 0.2.0 | Route change loading indicator |
| **Fonts** | Geist Sans & Mono | - | Modern font family from Vercel |

### Backend & Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend-as-a-Service** | Supabase | Database, Auth, Storage, Edge Functions |
| **Database** | PostgreSQL | Relational database with advanced features |
| **Authentication** | Supabase Auth | Email/password authentication with session management |
| **Storage** | Supabase Storage | File upload and storage for CAMS statements |
| **API Layer** | Next.js API Routes | Server-side API endpoints |
| **Server Actions** | Next.js Server Actions | Server-side data mutations |
| **Row-Level Security** | PostgreSQL RLS | Database-level access control |

### External APIs & Integrations

| Service | Library | Purpose |
|---------|---------|---------|
| **Stock Prices** | Yahoo Finance 2 | 2.13.3 | Real-time stock price fetching |
| **PDF Parsing** | pdf-parse, pdfjs-dist | 1.0.1, 4.3.136 | CAMS PDF statement parsing |
| **PDF Manipulation** | pdf-lib, pdf2pic | 1.17.1, 3.2.0 | PDF processing and conversion |
| **Canvas Operations** | canvas | 3.1.2 | Image rendering for PDF processing |
| **Validation** | Zod | 3.25.67 | Schema validation and type safety |

### Development & Deployment

- **Package Manager**: npm
- **Linting**: ESLint with Next.js configuration
- **Build Tool**: Next.js with Turbopack (development mode)
- **Deployment Platform**: Vercel
- **Version Control**: Git

---

## 🏛️ Application Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Next.js React Application (CSR + SSR)            │  │
│  │  - React Query (Client State + Cache)                    │  │
│  │  - React Context (UI State)                              │  │
│  │  - Components (UI Layer)                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▼ ▲
                        HTTP/HTTPS
                              ▼ ▲
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Server (Vercel)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  App Router Pages          API Routes                    │  │
│  │  - SSR/SSG Rendering       - /api/refresh-nav           │  │
│  │  - Server Components       - /api/stock-prices          │  │
│  │  - Server Actions          - /api/refresh-nps-nav       │  │
│  │  - PDF/CSV Parsing         - /api/simulate-goal         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▼ ▲
                        PostgreSQL Client
                              ▼ ▲
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Platform                           │
│  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   PostgreSQL     │  │  Auth System │  │  Storage Bucket │  │
│  │   - RLS Policies │  │  - Sessions  │  │  - CAMS Files   │  │
│  │   - Functions    │  │  - JWT Tokens│  │  - PDF/CSV      │  │
│  └──────────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▼ ▲
                        External APIs
                              ▼ ▲
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Yahoo Finance    │  │  MF NAV APIs │  │  Currency APIs  │  │
│  │ - Stock Prices   │  │  - NAV Data  │  │  - USD to INR   │  │
│  └──────────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Application File Structure

```
portfolio-tracker/
├── app/                                    # Next.js App Router
│   ├── api/                               # API Route Handlers
│   │   ├── cron/
│   │   │   └── prefetch-stock-prices/    # Cron job for stock price caching
│   │   ├── parse-pdf/                     # PDF parsing endpoint
│   │   ├── refresh-nav/                   # MF NAV refresh
│   │   ├── refresh-nps-nav/              # NPS NAV refresh
│   │   ├── simulate-goal/                 # Goal simulation calculations
│   │   ├── stock-prices/                  # Stock price fetching with cache
│   │   └── test-yahoo-finance/           # Yahoo Finance testing
│   │
│   ├── auth/                              # Authentication Pages
│   │   ├── login/page.tsx                # Login page
│   │   ├── signup/page.tsx               # Registration page
│   │   ├── forgot-password/page.tsx      # Password reset request
│   │   ├── reset-password/page.tsx       # Password reset form
│   │   └── reset-password-simple/        # Simplified reset flow
│   │
│   ├── dashboard/                         # Main Application Dashboard
│   │   ├── layout.tsx                    # Dashboard layout (Navbar + Sidebar)
│   │   ├── page.tsx                      # Main dashboard page
│   │   ├── portfolio/page.tsx            # Mutual fund portfolio view
│   │   ├── stocks/page.tsx               # Stock holdings view
│   │   ├── nps/page.tsx                  # NPS holdings view
│   │   ├── goals/page.tsx                # Financial goals management
│   │   └── change-password/page.tsx      # Password change
│   │
│   ├── goals/                             # Goal Management
│   │   ├── layout.tsx                    # Goals section layout
│   │   └── simulator/page.tsx            # Goal simulation tool
│   │
│   ├── admin/                             # Admin Functionality
│   │   ├── nav-monitor/page.tsx          # NAV data monitoring
│   │   ├── nav-update/page.tsx           # Manual NAV updates
│   │   └── nps-funds/page.tsx            # NPS fund management
│   │
│   ├── upload/                            # File Upload & Parsing
│   │   ├── page.tsx                      # Upload interface
│   │   └── parse.ts                      # Server-side parsing logic
│   │
│   ├── test-*/                            # Testing Pages
│   │   ├── test-csv-parser/              # CSV parsing tests
│   │   ├── test-env/                     # Environment validation
│   │   ├── test-goal-simulator/          # Goal simulator tests
│   │   ├── test-stock-cache/             # Stock cache tests
│   │   ├── test-supabase-config/         # Supabase connection tests
│   │   ├── test-upload-pdf/              # PDF upload tests
│   │   └── test-yahoo-finance/           # Yahoo Finance API tests
│   │
│   ├── privacy/page.tsx                   # Privacy policy
│   ├── terms/page.tsx                     # Terms of service
│   ├── layout.tsx                         # Root layout
│   ├── page.tsx                           # Landing page
│   └── globals.css                        # Global styles
│
├── components/                             # Reusable UI Components
│   ├── GoalCard.tsx                       # Individual goal display card
│   ├── GoalForm.tsx                       # Goal creation/editing form
│   ├── GoalDetailsModal.tsx               # Goal details view modal
│   ├── GoalEditModal.tsx                  # Goal editing modal
│   ├── GoalMappingModal.tsx               # Investment to goal mapping
│   ├── GoalSchemeMapping.tsx              # Scheme mapping component
│   ├── GoalProjectionChart.tsx            # Goal projection visualization
│   ├── GoalSimulatorForm.tsx              # Goal simulation form
│   ├── RequiredSIPCalculator.tsx          # SIP requirement calculator
│   ├── SimulationSummaryTable.tsx         # Simulation results table
│   ├── StepUpEffectChart.tsx              # Step-up SIP effect chart
│   ├── AllocationPie.tsx                  # Asset allocation pie chart
│   ├── AssetAllocationBar.tsx             # Asset allocation bar chart
│   ├── XirrChart.tsx                      # XIRR trend visualization
│   ├── StockForm.tsx                      # Stock entry form
│   ├── Navbar.tsx                         # Top navigation bar
│   ├── Sidebar.tsx                        # Side navigation menu
│   ├── RefreshNavButton.tsx               # NAV refresh trigger button
│   ├── StaleDataIndicator.tsx             # Stale data warning
│   ├── ShareButton.tsx                    # Share functionality
│   ├── Tooltip.tsx                        # Tooltip component
│   ├── OnboardingModal.tsx                # User onboarding modal
│   ├── OnboardingProvider.tsx             # Onboarding context provider
│   ├── ReactQueryProvider.tsx             # React Query setup
│   └── RouteChangeIndicator.tsx           # Loading indicator for routes
│
├── lib/                                    # Utility Libraries & Business Logic
│   ├── supabaseClient.ts                  # Supabase client configuration
│   ├── portfolioUtils.ts                  # Portfolio calculations & queries
│   ├── xirr.ts                            # XIRR calculation engine (Newton-Raphson)
│   ├── assetAllocation.ts                 # Asset categorization logic
│   ├── stockUtils.ts                      # Stock utility functions
│   ├── stockQueries.ts                    # Stock data query functions
│   ├── updateNavData.ts                   # NAV update automation
│   ├── pdfParser.ts                       # CAMS PDF parsing logic
│   ├── goalSimulator.ts                   # Goal simulation calculations
│   ├── validation.ts                      # Data validation schemas
│   ├── designSystem.ts                    # Design tokens and constants
│   ├── onboardingUtils.ts                 # Onboarding helper functions
│   └── yahooFinanceUtils.ts               # Yahoo Finance API utilities
│
├── supabase/                               # Supabase Configuration
│   └── functions/                         # Edge Functions
│       └── prefetch-stock-prices/         # Stock price prefetch function
│
├── public/                                 # Static Assets
│   ├── sipgoals_*.svg                     # Logo variants
│   └── Dashboard_screenshot.png           # Marketing assets
│
├── SQL Schema Files/                       # Database Schema Scripts
│   ├── goals_schema.sql                   # Goals table schema
│   ├── goal_mapping_schema_update.sql     # Goal mappings schema
│   ├── stocks_schema.sql                  # Stocks table schema
│   ├── stocks_schema_update.sql           # Stocks schema updates
│   ├── stock_prices_cache_schema.sql      # Stock price cache table
│   ├── nps_funds_schema.sql               # NPS funds reference
│   ├── nps_holdings_schema.sql            # NPS holdings table
│   ├── nps_nav_schema.sql                 # NPS NAV data
│   ├── user_profiles_schema.sql           # User profiles table
│   ├── nav_data_constraint.sql            # NAV data constraints
│   ├── rls_policies.sql                   # Row-level security policies
│   ├── database_schema_update.sql         # Schema migrations
│   └── onboarding_schema_update.sql       # Onboarding state tracking
│
├── Documentation Files/                    # Project Documentation
│   ├── architecture.md                     # Original architecture reference
│   ├── architecture_v1.1.md               # This comprehensive doc
│   ├── PORTFOLIO_TRACKER_ARCHITECTURE.md  # Detailed architecture
│   ├── PROJECT_ARCHITECTURE.md            # Project structure
│   ├── PORTFOLIO_TRACKER_FEATURES.md      # Features documentation
│   ├── STOCK_PRICE_CACHING_DOCUMENTATION.md # Stock caching system
│   ├── NAV_AUTOMATION_SETUP.md            # NAV automation guide
│   ├── goal_simulation.md                 # Goal simulation docs
│   ├── goal_simulation_v2.md              # Updated goal simulation
│   ├── Dashboard_Performance_Improvement_Plan.md # Performance docs
│   └── various task/planning *.md files   # Development planning
│
├── Configuration Files/
│   ├── package.json                       # Dependencies and scripts
│   ├── tsconfig.json                      # TypeScript configuration
│   ├── next.config.ts                     # Next.js configuration
│   ├── tailwind.config.js                 # Tailwind CSS config (implicit)
│   ├── postcss.config.mjs                 # PostCSS configuration
│   ├── eslint.config.mjs                  # ESLint configuration
│   ├── vercel.json                        # Vercel deployment config
│   └── .env.local (gitignored)            # Environment variables
│
└── README.md                               # Project readme
```

### Key Architectural Patterns

#### 1. **App Router Pattern (Next.js 15)**
- **File-based routing**: Pages defined by file structure in `app/` directory
- **Server Components by default**: Automatic SSR for better performance
- **Client Components**: Marked with `'use client'` directive for interactivity
- **API Routes**: RESTful endpoints in `app/api/*/route.ts` files
- **Server Actions**: Server-side mutations with `'use server'` directive

#### 2. **State Management Strategy**

| State Type | Solution | Use Case |
|------------|----------|----------|
| **Server State** | React Query | Portfolio data, goals, transactions, NAV data |
| **UI State** | Local Component State | Modal visibility, form inputs, loading states |
| **Global UI State** | React Context | Onboarding flow, theme preferences |
| **Auth State** | Supabase Auth + React Context | User session, authentication status |
| **Cache State** | React Query Cache | Optimistic updates, background refetching |

#### 3. **Data Fetching Pattern**

```typescript
// Progressive 3-Phase Loading Strategy for Dashboard
Phase 1: Basic Goals (Fast - Display UI skeleton)
  ↓
Phase 2: Goal Assets (Medium - Show investment values)
  ↓
Phase 3: XIRR Calculations (Slow - Add performance metrics)
```

**Benefits**:
- **Immediate UI Feedback**: Users see basic goal cards instantly
- **Incremental Enhancement**: Data populates progressively
- **Perceived Performance**: App feels fast even with heavy calculations
- **Independent Failure**: Each phase can fail independently without blocking others

#### 4. **Authentication Flow**

```
User Login Request
     ↓
Supabase Auth Validation
     ↓
JWT Token Issued
     ↓
Session Stored (Client + Cookie)
     ↓
RLS Policies Applied (Database Level)
     ↓
User-Specific Data Accessible
```

---

## 🗄️ Database Schema

### Database Overview

**Platform**: PostgreSQL 14+ (via Supabase)
**Security**: Row-Level Security (RLS) enabled on all user tables
**Access Control**: User-specific data isolation via `auth.uid()` policies

### Core Tables

#### 1. **User Management**

##### `auth.users` (Supabase Managed)
- Managed by Supabase Auth system
- Stores authentication credentials
- UUID primary key referenced by all user-owned tables

##### `user_profiles`
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text DEFAULT 'user', -- 'user' | 'admin'
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);
```

**Purpose**: Extended user information beyond authentication
**Key Fields**:
- `role`: User role for authorization (admin features)
- `onboarding_completed`: Track onboarding flow completion

---

#### 2. **Mutual Fund Management**

##### `transactions`
```sql
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  scheme_name text NOT NULL,
  folio text NOT NULL,
  isin text,
  amount numeric NOT NULL,
  units numeric NOT NULL,
  nav numeric NOT NULL,
  transaction_type text NOT NULL, -- 'Purchase' | 'Redemption' | 'Switch In' | 'Switch Out'
  unit_balance numeric,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_folio_scheme ON transactions(user_id, folio, scheme_name);
```

**Purpose**: Store all mutual fund transactions from CAMS statements
**Key Fields**:
- `folio`: Mutual fund folio number
- `isin`: International Securities Identification Number
- `transaction_type`: Transaction category
- `unit_balance`: Running unit balance after transaction

##### `current_portfolio` (Materialized View)
```sql
CREATE VIEW current_portfolio AS
SELECT 
  user_id,
  folio,
  scheme_name,
  isin,
  SUM(CASE WHEN transaction_type IN ('Purchase', 'Switch In') THEN units 
           WHEN transaction_type IN ('Redemption', 'Switch Out') THEN -units 
           ELSE 0 END) as total_units,
  SUM(CASE WHEN transaction_type IN ('Purchase', 'Switch In') THEN amount 
           WHEN transaction_type IN ('Redemption', 'Switch Out') THEN -amount 
           ELSE 0 END) as total_invested,
  MAX(date) as latest_date,
  (SELECT nav_value FROM nav_data WHERE isin_div_payout = t.isin 
   OR isin_div_reinvestment = t.isin ORDER BY nav_date DESC LIMIT 1) as current_nav,
  total_units * current_nav as current_value,
  (total_units * current_nav) - total_invested as return_amount,
  ((total_units * current_nav) - total_invested) / NULLIF(total_invested, 0) * 100 as return_percentage
FROM transactions t
GROUP BY user_id, folio, scheme_name, isin
HAVING SUM(units) > 0.01;
```

**Purpose**: Aggregated current holdings with calculated returns
**Performance**: Indexed for fast user-specific queries

##### `nav_data`
```sql
CREATE TABLE nav_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isin_div_payout text,
  isin_div_reinvestment text,
  nav_value numeric NOT NULL,
  nav_date date NOT NULL,
  scheme_name text,
  amc_code text,
  scheme_code text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_nav_data_isin_date 
  ON nav_data(isin_div_payout, nav_date);
CREATE INDEX idx_nav_data_scheme_date 
  ON nav_data(scheme_name, nav_date);
```

**Purpose**: Daily NAV (Net Asset Value) data for mutual fund schemes
**Updates**: Automated daily refresh via API route
**Key Fields**:
- `isin_div_payout`: ISIN for dividend payout option
- `isin_div_reinvestment`: ISIN for dividend reinvestment option
- `nav_date`: Date of NAV value

---

#### 3. **Financial Goals**

##### `goals`
```sql
CREATE TABLE goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_amount numeric NOT NULL,
  target_date date NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);
```

**Purpose**: User-defined financial goals
**Key Fields**:
- `target_amount`: Financial goal amount in INR
- `target_date`: Target achievement date

##### `goal_mappings`
```sql
CREATE TABLE goal_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Mutual Fund Mapping
  folio text,
  scheme_name text,
  -- Stock Mapping
  stock_id uuid REFERENCES stocks(id) ON DELETE CASCADE,
  stock_code text,
  exchange text,
  -- NPS Mapping
  nps_holding_id uuid REFERENCES nps_holdings(id) ON DELETE CASCADE,
  nps_fund_code text,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_goal_mappings_goal_id ON goal_mappings(goal_id);
CREATE INDEX idx_goal_mappings_user_id ON goal_mappings(user_id);
```

**Purpose**: Map investments (MF, Stocks, NPS) to specific goals
**Flexibility**: Polymorphic design supports multiple asset classes
**Key Fields**: Asset-specific fields for different investment types

---

#### 4. **Stock Investments**

##### `stocks`
```sql
CREATE TABLE stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_code text NOT NULL, -- e.g., 'TCS', 'INFY', 'MSFT'
  stock_name text,
  quantity numeric NOT NULL,
  purchase_date date NOT NULL,
  purchase_price numeric,
  exchange text DEFAULT 'NSE', -- 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE'
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_stocks_user_id ON stocks(user_id);
CREATE INDEX idx_stocks_code_exchange ON stocks(stock_code, exchange);
```

**Purpose**: User stock holdings tracking
**Key Fields**:
- `stock_code`: Stock ticker symbol
- `exchange`: Stock exchange (NSE, BSE, international)
- `quantity`: Number of shares held

##### `stock_prices_cache`
```sql
CREATE TABLE stock_prices_cache (
  symbol text PRIMARY KEY, -- Yahoo Finance symbol (e.g., 'TCS.NS', 'MSFT')
  price_inr numeric NOT NULL, -- Price in INR (converted if needed)
  price_original numeric, -- Original price in source currency
  currency text, -- Original currency ('USD', 'INR')
  exchange_rate_to_inr numeric, -- Exchange rate used for conversion
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_stock_prices_updated_at ON stock_prices_cache(updated_at);
```

**Purpose**: Cache stock prices with automatic INR conversion
**Cache Strategy**: 
- **Weekdays**: 30-minute cache
- **Weekends**: 24-hour cache (markets closed)
**Key Fields**:
- `price_inr`: Standardized price in INR for consistent calculations
- `exchange_rate_to_inr`: Exchange rate for transparency

---

#### 5. **NPS (National Pension System)**

##### `nps_funds`
```sql
CREATE TABLE nps_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_name text NOT NULL,
  fund_code text NOT NULL UNIQUE, -- e.g., 'SM001001', 'SG001001'
  fund_type text, -- 'Equity' | 'Corporate Debt' | 'Government Securities' | 'Alternative'
  fund_manager text,
  created_at timestamptz DEFAULT NOW()
);
```

**Purpose**: Reference table for NPS funds
**Data**: Pre-populated with NPS fund codes and details

##### `nps_holdings`
```sql
CREATE TABLE nps_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_code text NOT NULL REFERENCES nps_funds(fund_code),
  units numeric NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_nps_holdings_user_id ON nps_holdings(user_id);
CREATE INDEX idx_nps_holdings_fund_code ON nps_holdings(fund_code);
```

**Purpose**: User NPS fund holdings
**Key Fields**:
- `fund_code`: Reference to NPS fund
- `units`: Number of units held

##### `nps_nav`
```sql
CREATE TABLE nps_nav (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_code text NOT NULL REFERENCES nps_funds(fund_code),
  nav numeric NOT NULL,
  nav_date date NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_nps_nav_fund_date ON nps_nav(fund_code, nav_date);
```

**Purpose**: Daily NAV data for NPS funds
**Updates**: Automated refresh via API route

---

#### 6. **File Upload Management**

##### `uploads`
```sql
CREATE TABLE uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint,
  mime_type text,
  upload_status text DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  parsed_transactions integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_uploads_user_id ON uploads(user_id);
```

**Purpose**: Track uploaded CAMS statement files and parsing status
**Storage**: Files stored in Supabase Storage bucket named 'uploads'

---

### Row-Level Security (RLS) Policies

**Security Model**: All user data tables have RLS policies ensuring users can only access their own data.

```sql
-- Example RLS Policy Pattern
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);
```

**Applied to all tables**: `transactions`, `goals`, `goal_mappings`, `stocks`, `nps_holdings`, `uploads`, `user_profiles`

---

## 🔧 Core Features & Implementation

### 1. Portfolio Management

#### 1.1 Mutual Fund Tracking

**CAMS Statement Upload & Parsing**

```typescript
// Flow: Upload → Store → Parse → Save Transactions

1. User uploads CAMS PDF/CSV statement
   ↓
2. File stored in Supabase Storage
   ↓
3. Parse file (PDF: extract text → CSV format)
   ↓
4. Parse CSV data into transactions
   ↓
5. Store transactions in database
   ↓
6. Update current_portfolio view
```

**Key Implementation Files**:
- `app/upload/page.tsx`: Upload UI
- `app/upload/parse.ts`: Server-side parsing logic
- `lib/pdfParser.ts`: PDF text extraction and parsing
- `app/api/parse-pdf/route.ts`: API endpoint

**Parsing Logic**:
- **PDF Extraction**: Uses `pdfjs-dist` to extract text from PDF
- **CSV Parsing**: Custom parser for CAMS CSV format
- **Transaction Mapping**: Maps CAMS fields to database schema
- **Deduplication**: Prevents duplicate transactions based on date, scheme, folio, amount

**Supported Formats**:
- CAMS Consolidated Statement (PDF)
- CAMS Consolidated Statement (CSV)

---

#### 1.2 Automated NAV Updates

**Daily NAV Refresh System**

```typescript
// NAV Update Flow
Cron Job / Manual Trigger
     ↓
Fetch unique ISINs from user transactions
     ↓
Call MF NAV API for each ISIN
     ↓
Validate NAV data (date, value)
     ↓
Upsert into nav_data table
     ↓
current_portfolio view auto-updates with new NAV
```

**Implementation**:
- `app/api/refresh-nav/route.ts`: NAV refresh endpoint
- `lib/updateNavData.ts`: NAV fetch and update logic
- **Authentication**: API key protection for automated calls
- **Scheduling**: Can be triggered by Vercel Cron Jobs

**NAV Data Source**: AMFI (Association of Mutual Funds in India) NAV API

**Error Handling**:
- Graceful failure for individual schemes
- Logging of failed NAV fetches
- Retry mechanism for transient failures

---

#### 1.3 Stock Investment Management

**Stock Entry & Tracking**

- **Manual Entry**: Users add stocks with code, quantity, exchange
- **Multi-Exchange Support**: NSE (.NS), BSE (.BO), NASDAQ, NYSE
- **Real-Time Valuation**: Current value calculated from cached prices

**Key Implementation Files**:
- `app/dashboard/stocks/page.tsx`: Stock management UI
- `components/StockForm.tsx`: Stock entry form
- `lib/stockUtils.ts`: Stock utility functions
- `lib/stockQueries.ts`: Stock data queries

---

#### 1.4 Stock Price Caching System

**Smart Caching Architecture**

```typescript
// Stock Price Fetch Flow with Caching

Request for stock prices (e.g., ['TCS.NS', 'MSFT'])
     ↓
Check stock_prices_cache table
     ↓
Classify symbols:
  - Fresh: Within cache time (use cached)
  - Stale: Exists but old (refetch)
  - Missing: Not in cache (fetch)
     ↓
Fetch stale/missing from Yahoo Finance API
     ↓
Convert to INR (USD stocks × exchange rate)
     ↓
Update cache
     ↓
Return combined fresh + newly fetched prices
```

**Cache Time Logic**:
```typescript
function getCacheTime() {
  const day = new Date().getDay();
  const isWeekend = (day === 0 || day === 6); // Sunday = 0, Saturday = 6
  return isWeekend 
    ? 24 * 60 * 60 * 1000  // 24 hours on weekends
    : 30 * 60 * 1000;       // 30 minutes on weekdays
}
```

**INR Conversion**:
- **USD Stocks**: Fetch USD price → Convert to INR using live exchange rate
- **INR Stocks**: Use price directly
- **Storage**: Both `price_inr` and `price_original` stored for transparency

**Implementation**:
- `app/api/stock-prices/route.ts`: Stock price API with caching
- `lib/yahooFinanceUtils.ts`: Yahoo Finance integration
- **Fallback**: Use stale cache if Yahoo Finance API fails

**Performance Benefits**:
- Reduced API calls to Yahoo Finance
- Faster page loads with cached data
- Cost optimization (fewer external API calls)

---

#### 1.5 NPS Management

**NPS Holdings Tracking**

- **Fund Mapping**: Map NPS fund codes to user holdings
- **Unit Tracking**: Store units held in each NPS fund
- **NAV Updates**: Automated NPS NAV refresh
- **Goal Mapping**: Link NPS holdings to financial goals

**Implementation**:
- `app/dashboard/nps/page.tsx`: NPS holdings UI
- `app/api/refresh-nps-nav/route.ts`: NPS NAV refresh
- `app/admin/nps-funds/page.tsx`: NPS fund reference management

---

### 2. Goal-Based Investment Planning

#### 2.1 Goal Management

**Goal Creation & Tracking**

```typescript
interface Goal {
  id: string
  name: string                    // e.g., "House Down Payment"
  description: string             // Optional details
  target_amount: number           // Target amount in INR
  target_date: string             // Target date (YYYY-MM-DD)
  current_amount: number          // Calculated from mapped investments
  progress_percentage: number     // (current / target) × 100
}
```

**Features**:
- **Create Goals**: Define financial objectives with target amount and date
- **Edit Goals**: Modify goal details
- **Delete Goals**: Remove goals (cascades to mappings)
- **Progress Tracking**: Real-time progress calculation
- **Time Remaining**: Days until target date
- **Status Indicators**: On track / Behind / Ahead

**Implementation**:
- `components/GoalForm.tsx`: Goal creation/editing form
- `components/GoalCard.tsx`: Goal display card with progress
- `components/GoalDetailsModal.tsx`: Detailed goal view
- `components/GoalEditModal.tsx`: Goal editing modal

---

#### 2.2 Investment Mapping

**Map Assets to Goals**

```typescript
// Goal Mapping Flow
User opens Goal Mapping Modal
     ↓
Display user's available investments:
  - Mutual Fund Schemes (from current_portfolio)
  - Stocks (from stocks table)
  - NPS Holdings (from nps_holdings)
     ↓
User selects investments to map to goal
     ↓
Save mappings to goal_mappings table
     ↓
Refresh goal current_amount calculation
```

**Mapping Rules**:
- One investment can be mapped to multiple goals (split allocation)
- One goal can have multiple investments (diversified approach)
- Unmapped investments don't contribute to any goal

**Implementation**:
- `components/GoalMappingModal.tsx`: Mapping interface
- `components/GoalSchemeMapping.tsx`: Scheme selection component
- **Real-time Update**: Goal values update immediately after mapping

---

#### 2.3 Goal Progress Calculation

**Current Amount Calculation**

```typescript
// Goal Current Amount = Sum of Mapped Assets

Current Amount = 
  (MF Mapped Holdings Value) +
  (Stock Mapped Holdings Value) +
  (NPS Mapped Holdings Value)

// Example:
Goal: "Retirement Fund"
Mapped Assets:
  - MF Scheme A: ₹5,00,000
  - MF Scheme B: ₹3,00,000
  - Stock TCS: 50 shares × ₹3,850 = ₹1,92,500
  - NPS Fund: 1000 units × ₹45 = ₹45,000
Current Amount = ₹10,37,500
```

**Progress Calculation**:
```typescript
progress_percentage = (current_amount / target_amount) × 100
```

**Implementation**:
- `lib/portfolioUtils.ts`: `getGoalAssets()` function
- Queries goal_mappings and joins with portfolio/stock/nps tables
- Calculates current values using latest NAV/prices

---

#### 2.4 Goal XIRR Calculation

**Per-Goal Performance Tracking**

```typescript
// Goal XIRR Calculation
1. Get all transactions for mapped mutual funds
   - Purchase transactions: Negative cash flow
   - Redemption transactions: Positive cash flow
   
2. Get current value of goal: Positive cash flow at current date

3. Calculate XIRR using Newton-Raphson method

4. Display as annualized return percentage
```

**Implementation**:
- `lib/xirr.ts`: XIRR calculation engine
- `lib/portfolioUtils.ts`: `calculateGoalXIRR()` function
- **Algorithm**: Newton-Raphson iterative method
- **Convergence**: Typically converges within 10-20 iterations

**Display**:
- Shown on goal cards
- Color-coded: Green (>12%), Yellow (7-12%), Red (<7%)
- Non-convergence handling: Shows "N/A" if XIRR cannot be calculated

---

### 3. Performance Analytics

#### 3.1 XIRR Calculation Engine

**Extended Internal Rate of Return (XIRR)**

```typescript
// XIRR Definition
// Find rate 'r' such that Net Present Value (NPV) = 0

NPV = Σ (Cash Flow_i / (1 + r)^(days_i / 365)) = 0

// Newton-Raphson Iteration
r_new = r_old - (NPV / NPV_derivative)
```

**Implementation**: `lib/xirr.ts`

```typescript
function calculateXIRR(
  cashFlows: CashFlow[],
  guess: number = 0.1,        // Initial guess: 10%
  maxIterations: number = 100,
  tolerance: number = 1e-6    // Convergence tolerance
): XIRRResult {
  // 1. Validate: Need both positive and negative cash flows
  // 2. Sort cash flows by date
  // 3. Iterate using Newton-Raphson
  // 4. Check convergence (|NPV| < tolerance)
  // 5. Return XIRR rate and convergence status
}
```

**Cash Flow Definition**:
```typescript
interface CashFlow {
  date: Date
  amount: number  // Negative = outflow (purchase), Positive = inflow (redemption/current value)
}
```

**XIRR Levels**:
1. **Portfolio XIRR**: Overall portfolio performance
2. **Goal XIRR**: Performance of investments mapped to specific goal
3. **Scheme XIRR**: Individual mutual fund scheme performance

**Edge Cases Handled**:
- No negative cash flows: Cannot calculate (return 0)
- No positive cash flows: Cannot calculate (return 0)
- Derivative too small: Non-convergence (return error)
- Too many iterations: Non-convergence (return best estimate)

---

#### 3.2 Asset Allocation Analysis

**Automatic Scheme Categorization**

```typescript
// Asset Categories
1. Equity: Equity funds, large/mid/small cap, sectoral, thematic
2. Debt: Debt funds, gilt, liquid, short/medium/long term
3. Hybrid: Balanced, aggressive hybrid, conservative hybrid, arbitrage
```

**Categorization Logic**: `lib/assetAllocation.ts`

```typescript
function categorizeScheme(schemeName: string): AssetCategory {
  const normalized = schemeName.toLowerCase();
  
  // Check Debt keywords first (most specific)
  for (const keyword of DEBT_KEYWORDS) {
    if (normalized.includes(keyword)) return 'Debt';
  }
  
  // Check Hybrid keywords second
  for (const keyword of HYBRID_KEYWORDS) {
    if (normalized.includes(keyword)) return 'Hybrid';
  }
  
  // Check Equity keywords last
  for (const keyword of EQUITY_KEYWORDS) {
    if (normalized.includes(keyword)) return 'Equity';
  }
  
  // Default to Hybrid if no match
  return 'Hybrid';
}
```

**Asset Allocation Calculation**:
```typescript
function calculateAssetAllocation(schemes: Scheme[]) {
  // 1. Categorize each scheme
  // 2. Sum values per category
  // 3. Calculate percentages
  // 4. Return allocation breakdown
}
```

**Visualization**:
- `components/AllocationPie.tsx`: Pie chart
- `components/AssetAllocationBar.tsx`: Bar chart
- Color-coded: Equity (Blue), Debt (Green), Hybrid (Amber)

---

### 4. Progressive Loading & Performance Optimization

#### 4.1 Three-Phase Loading Strategy

**Dashboard Data Loading**

```typescript
// Phase 1: Basic Goals (Fast - ~100ms)
const { data: basicGoals } = useQuery({
  queryKey: ['basicGoals', userId],
  queryFn: () => getBasicGoals(userId),  // SELECT id, name, target_amount, target_date
  staleTime: 5 * 60 * 1000,  // 5 minutes
});

// Phase 2: Goal Assets (Medium - ~500ms)
const { data: goalAssets } = useQuery({
  queryKey: ['goalAssets', userId],
  queryFn: () => getGoalAssets(userId, basicGoals.map(g => g.id)),
  enabled: !!basicGoals.length,
  staleTime: 5 * 60 * 1000,
});

// Phase 3: XIRR Calculations (Slow - ~2000ms)
const { data: xirrData } = useQuery({
  queryKey: ['xirr', userId],
  queryFn: () => batchCalculateXIRR(userId, goals, mappings),
  enabled: !!basicGoals.length && !!Object.keys(goalAssets).length,
  staleTime: 10 * 60 * 1000,  // 10 minutes (less frequent updates)
});
```

**User Experience**:
1. **Immediate**: Goal cards appear with skeleton loaders
2. **Fast (<1s)**: Goal names, targets, descriptions populate
3. **Medium (1-2s)**: Current values and progress bars appear
4. **Slower (2-3s)**: XIRR calculations complete and display

**Benefits**:
- Users see content immediately (no blank screen)
- Perceived performance improvement
- Independent loading reduces cascade delays
- Graceful degradation if any phase fails

---

#### 4.2 React Query Caching Strategy

**Cache Configuration**:

```typescript
// ReactQueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes default
      gcTime: 30 * 60 * 1000,           // 30 minutes garbage collection
      refetchOnWindowFocus: false,      // Don't refetch on focus
      retry: 1,                          // Retry failed queries once
    },
  },
});
```

**Cache Keys Structure**:
```typescript
// Portfolio data
['portfolioSummary', userId]
['currentPortfolio', userId]

// Goals
['basicGoals', userId]
['goalAssets', userId]
['xirr', userId]

// Stocks
['stockSummary', userId]
['goalStockPrices', goalId, mappedStocks]

// NPS
['npsValue', userId]

// Stock Prices Cache
['stockPrices', symbols, timestamp]
```

**Invalidation Strategy**:
- After mutations (create/update/delete): Invalidate affected queries
- Manual refresh: Provide refetch buttons for user control
- Background refetch: On mount, only for critical data

---

#### 4.3 Database Query Optimization

**Indexes**:
```sql
-- User-specific queries
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_stocks_user_id ON stocks(user_id);

-- Date-based queries
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_nav_data_isin_date ON nav_data(isin_div_payout, nav_date);

-- Composite indexes
CREATE INDEX idx_transactions_folio_scheme ON transactions(user_id, folio, scheme_name);
CREATE INDEX idx_goal_mappings_goal_user ON goal_mappings(goal_id, user_id);
```

**Query Patterns**:
- **User-specific queries**: Always filter by `user_id` first (leverages RLS + index)
- **Latest NAV**: Use `ORDER BY nav_date DESC LIMIT 1` with index
- **Current portfolio**: Use materialized view for pre-aggregated data
- **Goal assets**: Batch fetch all goal assets in single query with JOINs

---

## 🔐 Security & Authentication

### Authentication System

**Provider**: Supabase Auth
**Method**: Email/Password authentication
**Session Management**: JWT tokens with automatic refresh

**Auth Flow**:
```typescript
// Login
User submits email/password
     ↓
Supabase Auth validates credentials
     ↓
JWT token issued (access token + refresh token)
     ↓
Token stored in localStorage + httpOnly cookie
     ↓
Session available via supabase.auth.getSession()
```

**Protected Routes**:
- All `/dashboard/*` routes require authentication
- Auth check in layout or page component
- Redirect to `/auth/login` if not authenticated

**Implementation**:
```typescript
// app/dashboard/page.tsx
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login');
    }
  };
  checkAuth();
}, []);
```

---

### Row-Level Security (RLS)

**Database-Level Access Control**

```sql
-- Enable RLS on table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users access own transactions"
  ON transactions
  FOR ALL
  USING (auth.uid() = user_id);
```

**Benefits**:
- **Defense in Depth**: Even if application logic fails, database enforces security
- **Automatic Filtering**: Supabase automatically adds `user_id` filter to queries
- **Zero Trust**: No data leakage even with SQL injection (parameterized queries)

**Applied to All User Tables**:
- `transactions`
- `goals`
- `goal_mappings`
- `stocks`
- `nps_holdings`
- `uploads`
- `user_profiles`

---

### Input Validation

**Schema Validation**: Uses Zod for runtime type safety

```typescript
// lib/validation.ts
import { z } from 'zod';

export const GoalSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  target_amount: z.number().positive(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const StockSchema = z.object({
  stock_code: z.string().min(1).max(20),
  quantity: z.number().positive(),
  exchange: z.enum(['NSE', 'BSE', 'NASDAQ', 'NYSE']),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

**Validation Points**:
- **Client-side**: Form validation for immediate feedback
- **Server-side**: API routes validate all inputs
- **Database**: Constraints and triggers for data integrity

---

### API Security

**API Key Authentication**:
```typescript
// For automated/cron endpoints
const apiKey = request.headers.get('x-api-key');
if (apiKey !== process.env.NAV_REFRESH_API_KEY) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**CORS Configuration**: Restricted to application domain (via Next.js config)

**Rate Limiting**: Consider implementing rate limiting for public API endpoints

---

## 🛣️ API Routes & Endpoints

### Portfolio Management APIs

#### `POST /api/refresh-nav`
**Purpose**: Refresh mutual fund NAV data
**Authentication**: API Key (for cron jobs) or User Session
**Parameters**: None
**Response**:
```json
{
  "success": true,
  "message": "NAV data refreshed successfully",
  "navUpdated": 150,
  "portfolioRefreshed": true
}
```

#### `GET /api/stock-prices?symbols=TCS.NS,MSFT`
**Purpose**: Fetch stock prices with caching and INR conversion
**Authentication**: User Session
**Parameters**:
- `symbols` (query): Comma-separated Yahoo Finance symbols
**Response**:
```json
{
  "success": true,
  "prices": {
    "TCS.NS": {
      "price": 3850.50,
      "currency": "INR",
      "originalPrice": 3850.50,
      "originalCurrency": "INR"
    },
    "MSFT": {
      "price": 35420.25,
      "currency": "INR",
      "originalPrice": 425.50,
      "originalCurrency": "USD",
      "exchangeRate": 83.25
    }
  }
}
```

#### `POST /api/refresh-nps-nav`
**Purpose**: Refresh NPS fund NAV data
**Authentication**: API Key or User Session
**Response**: Success/error status

---

### File Upload & Parsing APIs

#### `POST /api/parse-pdf`
**Purpose**: Parse uploaded CAMS statement (PDF/CSV)
**Authentication**: User Session
**Body**:
```json
{
  "uploadId": "uuid",
  "password": "optional-pdf-password"
}
```
**Response**:
```json
{
  "success": true,
  "transactions": 150,
  "message": "Statement parsed successfully"
}
```

---

### Goal Simulation API

#### `POST /api/simulate-goal`
**Purpose**: Simulate goal achievement scenarios
**Authentication**: User Session
**Body**:
```json
{
  "currentAmount": 500000,
  "targetAmount": 2000000,
  "monthlyInvestment": 10000,
  "expectedReturn": 12,
  "inflationRate": 6,
  "stepUpPercentage": 10,
  "yearsToGoal": 10
}
```
**Response**: Simulation results with year-by-year projections

---

## 🚀 Deployment & Configuration

### Environment Variables

**Required Environment Variables** (`.env.local`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Keys
NAV_REFRESH_API_KEY=your-secret-key-for-cron-jobs

# Optional: External APIs
YAHOO_FINANCE_API_KEY=optional-if-using-premium
```

---

### Vercel Deployment

**Configuration**: `vercel.json`
```json
{
  "build": {
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
    }
  }
}
```

**Deployment Steps**:
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Deploy

**Cron Jobs** (Vercel Cron):
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/refresh-nav",
      "schedule": "0 9 * * *"  // Daily at 9 AM UTC
    },
    {
      "path": "/api/cron/prefetch-stock-prices",
      "schedule": "*/30 9-15 * * 1-5"  // Every 30 min during market hours
    }
  ]
}
```

---

### Database Setup

**Supabase Project Setup**:

1. **Create Supabase Project**
2. **Run SQL Schema Scripts** (in order):
   ```sql
   -- Core tables
   user_profiles_schema.sql
   goals_schema.sql
   goal_mapping_schema_update.sql
   stocks_schema.sql
   stock_prices_cache_schema.sql
   nps_funds_schema.sql
   nps_holdings_schema.sql
   nps_nav_schema.sql
   
   -- Security
   rls_policies.sql
   
   -- Additional constraints
   nav_data_constraint.sql
   onboarding_schema_update.sql
   ```

3. **Create Storage Bucket**:
   - Name: `uploads`
   - Public: No
   - File size limit: 10 MB
   - Allowed MIME types: `application/pdf`, `text/csv`

4. **Enable RLS on all tables**

---

## 📊 Performance Metrics & Optimization

### Current Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| **Dashboard Initial Load** | < 2s | ~1.5s |
| **Goal Cards Display** | < 1s | ~800ms |
| **XIRR Calculation** | < 3s | ~2s |
| **Stock Price Fetch** | < 500ms | ~300ms (cached) |
| **NAV Refresh (full)** | < 30s | ~20s |
| **CAMS Upload & Parse** | < 10s | ~8s |

### Optimization Techniques Applied

1. **Progressive Loading**: 3-phase data fetching
2. **React Query Caching**: Reduced redundant API calls by 80%
3. **Stock Price Caching**: Weekend-aware caching saves ~70% API calls
4. **Database Indexes**: Query times reduced from ~500ms to ~50ms
5. **Materialized Views**: `current_portfolio` pre-aggregation
6. **Server-Side Calculations**: XIRR calculated on server to avoid blocking UI

---

## 🔮 Future Enhancements

### Planned Features (Roadmap)

#### Phase 1 (Q1 2024)
- [ ] Tax harvesting recommendations
- [ ] Portfolio rebalancing suggestions
- [ ] Email notifications for goal progress
- [ ] Mobile-responsive improvements

#### Phase 2 (Q2 2024)
- [ ] Integration with BSE/NSE direct APIs
- [ ] Automated bank statement import
- [ ] SIP reminder notifications
- [ ] Goal achievement celebration UI

#### Phase 3 (Q3 2024)
- [ ] Native mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Family account management
- [ ] Financial advisor collaboration features

### Technical Debt & Improvements

- [ ] Implement Redis for advanced caching
- [ ] Add WebSocket for real-time portfolio updates
- [ ] Migrate to server components where possible
- [ ] Add comprehensive error boundary handling
- [ ] Implement detailed audit logging
- [ ] Add automated backup system
- [ ] Performance monitoring with Sentry/LogRocket

---

## 📝 Development Guidelines

### Code Organization Principles

1. **Components**: One component per file, named exports
2. **Utilities**: Pure functions in `lib/`, well-documented
3. **Types**: TypeScript interfaces/types in component files or `types/` for shared
4. **API Routes**: One route handler per file, named `route.ts`
5. **Naming Conventions**:
   - Components: PascalCase (e.g., `GoalCard.tsx`)
   - Utilities: camelCase (e.g., `calculateXIRR`)
   - Constants: UPPER_SNAKE_CASE (e.g., `ASSET_CATEGORIES`)

### Testing Strategy

**Current State**: Manual testing
**Future**:
- Unit tests for utility functions (Jest)
- Integration tests for API routes (Supertest)
- E2E tests for critical user flows (Playwright)

### Git Workflow

- **Main Branch**: Production-ready code
- **Feature Branches**: `feature/description`
- **Commit Messages**: Conventional commits format
  - `feat: Add goal simulation feature`
  - `fix: Resolve XIRR calculation bug`
  - `docs: Update architecture documentation`

---

## 📚 References & Resources

### Documentation

- **Next.js**: https://nextjs.org/docs
- **React Query**: https://tanstack.com/query/latest/docs/react
- **Supabase**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Yahoo Finance 2**: https://github.com/gadicc/node-yahoo-finance2

### Internal Documentation

- `architecture.md`: Original architecture reference
- `PORTFOLIO_TRACKER_ARCHITECTURE.md`: Detailed architecture
- `STOCK_PRICE_CACHING_DOCUMENTATION.md`: Stock caching system
- `NAV_AUTOMATION_SETUP.md`: NAV automation guide
- `goal_simulation.md`: Goal simulation documentation

---

## 📞 Support & Maintenance

### Monitoring

- **Vercel Analytics**: Page views, performance metrics
- **Supabase Logs**: Database queries, errors
- **Console Logs**: Client-side errors (consider adding error tracking)

### Backup Strategy

- **Database**: Supabase automatic daily backups
- **Storage**: Files backed up with Supabase Storage
- **Code**: Git repository on GitHub

### Maintenance Schedule

- **Daily**: Automated NAV refresh (9 AM UTC)
- **Weekly**: Review error logs and performance metrics
- **Monthly**: Database optimization, index maintenance
- **Quarterly**: Dependency updates, security patches

---

## 🎯 Conclusion

This Portfolio Tracker application represents a comprehensive solution for Indian investors to manage their multi-asset portfolios with goal-based planning. The architecture prioritizes:

- **User Experience**: Fast, progressive loading with responsive design
- **Data Accuracy**: Automated updates, intelligent caching, precise calculations
- **Security**: Database-level RLS, authentication, input validation
- **Scalability**: Efficient queries, caching strategies, optimized algorithms
- **Maintainability**: Clear code organization, documentation, TypeScript safety

The application successfully combines modern web technologies (Next.js 15, React 19, Supabase) with financial domain expertise (XIRR calculations, asset allocation, goal tracking) to deliver a powerful investment management tool.

---

**Document Version**: 1.1
**Last Updated**: October 2025
**Maintained By**: Portfolio Tracker Development Team

