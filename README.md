# Portfolio Tracker

A comprehensive portfolio tracking application built with Next.js, Supabase, and React Query. Track your mutual funds, stocks, NPS investments, and financial goals with real-time data and intelligent caching.

## 🚀 Features

- **Portfolio Management**: Track mutual funds, stocks, and NPS investments
- **Goal Tracking**: Set and monitor financial goals with progress tracking
- **Real-time Data**: Live stock prices with automatic INR conversion
- **Intelligent Caching**: Smart caching system with weekend-aware logic
- **XIRR Calculations**: Advanced return calculations for investments
- **Responsive Design**: Modern UI with mobile-first approach

## 📈 Stock Price System

The application includes a sophisticated stock price caching and INR conversion system:

- **Yahoo Finance Integration**: Real-time stock price fetching
- **Automatic INR Conversion**: USD to INR conversion with live exchange rates
- **Smart Caching**: 30-minute cache on weekdays, 24-hour on weekends
- **Fallback Mechanisms**: Graceful degradation when APIs fail
- **Performance Optimized**: Batch processing and efficient caching

📖 **Detailed Documentation**: See [STOCK_PRICE_CACHING_DOCUMENTATION.md](./STOCK_PRICE_CACHING_DOCUMENTATION.md) for complete system architecture and implementation details.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Functions)
- **Data Fetching**: React Query (TanStack Query)
- **Styling**: Tailwind CSS
- **Stock Data**: Yahoo Finance API
- **Deployment**: Vercel

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Setup

Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Setup

Run the SQL scripts in the project root to set up the database schema:

1. `stocks_schema.sql` - Stock investments table
2. `stock_prices_cache.sql` - Stock price caching table
3. `goals_schema.sql` - Financial goals table
4. `user_profiles_schema.sql` - User profiles table

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Supabase Documentation](https://supabase.com/docs) - learn about Supabase features.
- [React Query Documentation](https://tanstack.com/query/latest) - learn about React Query.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
