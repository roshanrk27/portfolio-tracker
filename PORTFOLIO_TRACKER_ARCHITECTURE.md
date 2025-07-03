# 🏗️ Portfolio Tracker - Comprehensive Architecture Documentation

## 📋 Project Overview

**Portfolio Tracker** is a comprehensive SaaS web application designed for Indian investors to manage and track their complete investment portfolio across multiple asset classes. The application provides goal-based investment tracking, real-time performance analytics, and portfolio insights with support for Mutual Funds, Stocks, and National Pension System (NPS) investments.

### 🎯 Core Value Proposition

- **Multi-Asset Portfolio Management**: Unified tracking across Mutual Funds, Stocks, and NPS
- **Goal-Based Investment Planning**: Map investments to specific financial goals with progress tracking
- **Real-Time Performance Analytics**: XIRR calculations, asset allocation analysis, and return metrics
- **Automated NAV Updates**: Daily NAV refresh for mutual funds with data validation
- **Live Stock Price Integration**: Real-time stock price fetching for accurate portfolio valuation
- **Comprehensive Reporting**: Visual charts, progress tracking, and performance insights

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.3.4 (React 19 + App Router)
- **Styling**: Tailwind CSS 4.0
- **State Management**: 
  - React Query (TanStack Query) for server state
  - React Context + Local State for UI state
- **Type Safety**: TypeScript 5.x
- **UI Components**: Custom component library with modern design system
- **Charts**: Custom chart components for XIRR and asset allocation visualization

### Backend & Database
- **Backend-as-a-Service**: Supabase
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Authentication**: Supabase Auth with session management
- **Storage**: Supabase Storage for file uploads
- **API**: Next.js API Routes for custom endpoints
- **Server Actions**: Next.js Server Actions for data mutations

### External Integrations
- **Stock Price APIs**: Real-time stock price fetching
- **Mutual Fund NAV**: Automated NAV data updates
- **NPS Data**: National Pension System fund management

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint with Next.js configuration
- **Build Tool**: Next.js with Turbopack for development
- **Deployment**: Vercel-ready configuration

## 🏛️ Application Architecture

### File Structure
```
portfolio-tracker/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── refresh-nav/          # NAV refresh endpoints
│   │   ├── refresh-nps-nav/      # NPS NAV updates
│   │   ├── stock-prices/         # Stock price fetching
│   │   └── refresh-portfolio-nav/ # Portfolio NAV updates
│   ├── auth/                     # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/                # Main dashboard
│   │   ├── layout.tsx           # Dashboard layout
│   │   ├── page.tsx             # Main dashboard
│   │   ├── portfolio/           # Portfolio management
│   │   ├── stocks/              # Stock investments
│   │   └── nps/                 # NPS management
│   ├── admin/                   # Admin functionality
│   │   ├── nav-update/          # NAV management
│   │   └── nps-funds/           # NPS fund management
│   ├── upload/                  # File upload & parsing
│   └── test-env/                # Testing environment
├── components/                   # Reusable UI components
│   ├── GoalCard.tsx             # Goal display component
│   ├── GoalForm.tsx             # Goal creation/editing
│   ├── GoalMappingModal.tsx     # Investment mapping
│   ├── AllocationPie.tsx        # Asset allocation chart
│   ├── XirrChart.tsx            # XIRR visualization
│   ├── StockForm.tsx            # Stock entry form
│   ├── Navbar.tsx               # Navigation
│   ├── Sidebar.tsx              # Side navigation
│   └── ReactQueryProvider.tsx   # Query provider
├── lib/                         # Utility libraries
│   ├── portfolioUtils.ts        # Portfolio calculations
│   ├── xirr.ts                  # XIRR calculation engine
│   ├── assetAllocation.ts       # Asset categorization
│   ├── stockUtils.ts            # Stock utilities
│   ├── stockQueries.ts          # Stock data queries
│   ├── updateNavData.ts         # NAV update logic
│   ├── validation.ts            # Data validation
│   ├── designSystem.ts          # Design tokens
│   └── supabaseClient.ts        # Database client
└── supabase/                    # Supabase configuration
    └── functions/               # Edge functions
```

## 🗄️ Database Schema

### Core Tables

#### Users & Authentication
- **auth.users** (Supabase managed)
- **user_profiles** - Extended user information and roles

#### Mutual Fund Management
```sql
-- Transactions table for MF investments
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  date date NOT NULL,
  scheme_name text NOT NULL,
  folio text NOT NULL,
  isin text,
  amount numeric NOT NULL,
  units numeric NOT NULL,
  nav numeric NOT NULL,
  type text NOT NULL, -- 'Purchase' | 'Redemption'
  unit_balance numeric,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Current portfolio view (materialized)
CREATE VIEW current_portfolio AS
SELECT 
  user_id, folio, scheme_name, isin,
  SUM(units) as total_units,
  SUM(amount) as total_invested,
  current_nav,
  current_value,
  return_amount,
  latest_date
FROM transactions
GROUP BY user_id, folio, scheme_name, isin;

-- NAV data storage
CREATE TABLE nav_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isin_div_payout text,
  isin_div_reinvestment text,
  nav_value numeric NOT NULL,
  nav_date date NOT NULL,
  scheme_name text,
  created_at timestamp with time zone DEFAULT NOW()
);
```

#### Goal Management
```sql
-- Financial goals
CREATE TABLE goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  target_amount numeric NOT NULL,
  target_date date NOT NULL,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Goal to investment mapping
CREATE TABLE goal_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE,
  folio text,
  scheme_name text,
  stock_code text,
  exchange text,
  nps_fund_code text,
  created_at timestamp with time zone DEFAULT NOW()
);
```

#### Stock Investments
```sql
CREATE TABLE stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  stock_code text NOT NULL,
  quantity numeric NOT NULL,
  purchase_date date NOT NULL,
  exchange text DEFAULT 'NSE',
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);
```

#### NPS Management
```sql
-- NPS funds reference
CREATE TABLE nps_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_name text NOT NULL,
  fund_code text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT NOW()
);

-- NPS holdings
CREATE TABLE nps_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  fund_code text NOT NULL,
  units numeric NOT NULL,
  created_at timestamp with time zone DEFAULT NOW()
);

-- NPS NAV data
CREATE TABLE nps_nav (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_code text NOT NULL,
  nav numeric NOT NULL,
  nav_date date NOT NULL,
  created_at timestamp with time zone DEFAULT NOW()
);
```

### Security & Access Control
- **Row-Level Security (RLS)** enabled on all tables
- **User-specific data isolation** through RLS policies
- **Admin role management** for system administration
- **Secure API endpoints** with authentication checks

## 🔧 Core Capabilities & Features

### 1. Portfolio Management

#### Mutual Fund Tracking
- **CAMS Statement Upload**: Parse and import mutual fund transactions
- **Automated NAV Updates**: Daily NAV refresh with data validation
- **Portfolio Aggregation**: Consolidated view across multiple folios
- **Transaction History**: Complete purchase/redemption history
- **Performance Tracking**: XIRR calculations and return analysis

#### Stock Investment Management
- **Stock Entry**: Manual stock purchase entry with quantity tracking
- **Real-Time Pricing**: Live stock price fetching from APIs
- **Multi-Exchange Support**: NSE, BSE, and international exchanges
- **Portfolio Valuation**: Real-time stock portfolio value calculation

#### NPS Management
- **Fund Mapping**: Map NPS funds to goals
- **Holdings Tracking**: Unit balance tracking across NPS funds
- **NAV Integration**: Automated NPS NAV updates
- **Performance Analysis**: NPS-specific return calculations

### 2. Goal-Based Investment Planning

#### Goal Management
- **Goal Creation**: Define financial goals with target amounts and dates
- **Investment Mapping**: Map mutual funds, stocks, and NPS to specific goals
- **Progress Tracking**: Real-time progress calculation against targets
- **Goal Analytics**: XIRR calculations per goal

#### Goal Features
- **Multi-Asset Mapping**: Map different asset classes to single goals
- **Progress Visualization**: Visual progress bars and status indicators
- **Time-based Alerts**: Days remaining and deadline tracking
- **Goal Editing**: Modify goals and mappings as needed

### 3. Performance Analytics

#### XIRR Calculations
- **Portfolio XIRR**: Overall portfolio performance calculation
- **Goal XIRR**: Performance calculation for specific goals
- **Scheme XIRR**: Individual mutual fund scheme performance
- **Real-Time Updates**: XIRR updates with NAV changes

#### Asset Allocation Analysis
- **Automatic Categorization**: Equity, Debt, Hybrid classification
- **Visual Charts**: Pie charts and bar charts for allocation
- **Percentage Breakdown**: Detailed allocation percentages
- **Category-wise Performance**: Performance analysis by asset class

### 4. Data Management & Automation

#### NAV Management
- **Daily NAV Updates**: Automated mutual fund NAV refresh
- **Data Validation**: NAV data integrity checks
- **Missing NAV Tracking**: Identification of schemes without NAV data
- **Manual Refresh**: On-demand NAV updates

#### Stock Price Management
- **Real-Time Fetching**: Live stock price updates
- **Caching Strategy**: Optimized API calls with caching
- **Error Handling**: Graceful handling of API failures
- **Multi-Exchange Support**: Support for different stock exchanges

### 5. User Experience Features

#### Dashboard
- **Portfolio Summary**: Total investments, current value, returns
- **Goal Overview**: Progress across all financial goals
- **Performance Metrics**: XIRR, asset allocation, return percentages
- **Quick Actions**: NAV refresh, goal creation, investment mapping

#### Navigation & Layout
- **Responsive Design**: Mobile and desktop optimized
- **Sidebar Navigation**: Easy access to different sections
- **Breadcrumb Navigation**: Clear page hierarchy
- **Loading States**: Smooth loading experiences

## 🔄 Data Flow & State Management

### Authentication Flow
1. **User Login**: Supabase Auth with email/password
2. **Session Management**: Automatic session handling
3. **Route Protection**: Protected routes with auth checks
4. **User Context**: Global user state management

### Portfolio Data Flow
1. **Data Fetching**: React Query for server state management
2. **Caching Strategy**: Optimistic updates and background refetching
3. **Real-Time Updates**: NAV and stock price updates
4. **Error Handling**: Graceful error states and retry mechanisms

### Goal Management Flow
1. **Goal Creation**: Form-based goal entry
2. **Investment Mapping**: Modal-based mapping interface
3. **Progress Calculation**: Real-time progress updates
4. **Performance Tracking**: XIRR calculations per goal

## 🚀 Performance Optimizations

### Frontend Optimizations
- **React Query**: Efficient data fetching and caching
- **Component Memoization**: Optimized re-renders
- **Lazy Loading**: Code splitting for better load times
- **Image Optimization**: Next.js image optimization

### Backend Optimizations
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Caching Strategy**: API response caching
- **Batch Operations**: Bulk NAV updates and data processing

### Data Processing
- **Server-Side Calculations**: XIRR and allocation calculations on server
- **Incremental Updates**: Only update changed data
- **Background Processing**: Non-blocking NAV updates
- **Error Recovery**: Robust error handling and retry logic

## 🔒 Security Features

### Authentication & Authorization
- **Supabase Auth**: Secure authentication system
- **Row-Level Security**: Database-level access control
- **Session Management**: Secure session handling
- **Role-Based Access**: Admin and user role management

### Data Protection
- **User Data Isolation**: Complete data separation between users
- **Input Validation**: Comprehensive data validation
- **SQL Injection Prevention**: Parameterized queries
- **File Upload Security**: Secure file handling and validation

## 📊 Monitoring & Analytics

### Performance Monitoring
- **Query Performance**: Database query optimization
- **API Response Times**: Endpoint performance tracking
- **Error Tracking**: Comprehensive error logging
- **User Analytics**: Usage pattern analysis

### Data Quality
- **NAV Data Validation**: Automated NAV data verification
- **Stock Price Accuracy**: Price validation and error handling
- **Transaction Integrity**: Data consistency checks
- **Backup & Recovery**: Regular data backups

## 🛣️ API Endpoints

### Portfolio Management
- `GET /api/refresh-nav` - Refresh mutual fund NAV data
- `GET /api/refresh-nps-nav` - Update NPS NAV data
- `GET /api/stock-prices` - Fetch real-time stock prices
- `GET /api/refresh-portfolio-nav` - Update portfolio NAV values

### Data Access
- Portfolio summary and holdings
- Goal progress and mappings
- XIRR calculations
- Asset allocation data
- Transaction history

## 🔮 Future Enhancements

### Planned Features
- **Mobile App**: Native mobile application
- **Advanced Analytics**: More sophisticated performance metrics
- **Tax Reporting**: Tax calculation and reporting features
- **Portfolio Rebalancing**: Automated rebalancing suggestions
- **Integration APIs**: Third-party platform integrations

### Technical Improvements
- **Real-Time Updates**: WebSocket-based real-time data
- **Advanced Caching**: Redis-based caching layer
- **Microservices**: Service-oriented architecture
- **Machine Learning**: AI-powered investment insights

## 📈 Scalability Considerations

### Database Scalability
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed queries for performance
- **Data Partitioning**: Partitioned tables for large datasets
- **Read Replicas**: Database read scaling

### Application Scalability
- **Horizontal Scaling**: Multiple application instances
- **CDN Integration**: Global content delivery
- **Load Balancing**: Traffic distribution
- **Caching Layers**: Multi-level caching strategy

---

*This document serves as a comprehensive reference for understanding the Portfolio Tracker application architecture, capabilities, and technical implementation details.* 