
# 🏗️ Investment Goal Tracker – Architecture

## 🧾 Overview

A SaaS web app to allow users to:

- Upload **CAMS Consolidated MF Transaction Statements**
- Map mutual fund investments to **specific financial goals**
- Track **progress** against those goals
- View portfolio **XIRR**, **asset allocation**, and **insights**

### Tech Stack

- **Frontend**: Next.js (React + App Router)
- **Backend/DB/Auth**: Supabase (PostgreSQL, Row-level security, Auth)
- **Storage**: Supabase Storage (for uploaded CAMS CSVs)
- **Parsing Layer**: Server-side CSV parsing (custom API Route or Server Action)
- **State Management**: React context + local component state + Supabase queries

## 📂 File + Folder Structure

```bash
/investment-goal-tracker
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── components/
│   │   │   └── GoalCard.tsx
│   │   └── charts/
│   │       ├── XirrChart.tsx
│   │       └── AllocationPie.tsx
│   ├── upload/
│   │   ├── page.tsx
│   │   └── parse.ts (Server Action or API)
│   ├── auth/
│   │   └── login.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── GoalForm.tsx
├── lib/
│   ├── supabaseClient.ts
│   ├── xirr.ts
│   └── parseCAMS.ts (PDF parsing logic)
├── context/
│   └── UserContext.tsx
├── types/
│   └── index.ts
├── utils/
│   └── assetAllocation.ts
├── .env.local
├── supabase/
│   ├── schema.sql
│   └── storage-buckets/
├── package.json
└── README.md
```

## ⚙️ Functional Breakdown

### `app/`

Contains all **routing + pages** in the App Router pattern.

- `/dashboard`: Goal overview, charts, portfolio status.
- `/upload`: Upload CAMS statement.
- `/auth/login`: Login page using Supabase auth.
- `/parse.ts`: Handles server-side parsing of CSVs.

### `components/`

Shared UI elements.

- `Navbar`, `Sidebar`: Navigation layout
- `GoalForm`: Add/edit financial goals
- `GoalCard`: Display individual goal progress
- `XirrChart`, `AllocationPie`: Visual insights

### `lib/`

Helper functions and services.

- `supabaseClient.ts`: Supabase client config
- `xirr.ts`: Function to compute XIRR from transactions
- `parseCAMS.ts`: Parses CAMS CSV and extracts MF data

### `context/`

Global React contexts.

- `UserContext.tsx`: Holds auth state, user info, and profile from Supabase

### `types/`

TypeScript types for portfolio, transactions, goals, etc.

```ts
type Transaction = {
  date: string;
  scheme: string;
  amount: number;
  type: 'Purchase' | 'Redemption';
  nav: number;
};

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  mappedSchemes: string[];
};
```

### `utils/`

Data transformation and logic utilities.

- `assetAllocation.ts`: Splits portfolio into equity, debt, hybrid etc.

### `supabase/`

Contains DB schema and Supabase config.

- `schema.sql`: Table creation scripts (users, transactions, goals, mappings)
- `storage-buckets`: Config for uploading and parsing PDF files

## 🔄 Data Flow & State Management

### 🔐 Authentication

- Handled via **Supabase Auth**
- On login, user info is fetched and stored in `UserContext`
- Protected routes (`/dashboard`, `/upload`) are gated via auth checks

### 📤 Upload & Parse

1. **User uploads CAMS CSV** via `/upload`
2. File is stored in **Supabase Storage**
3. Backend (Server Action/API Route) downloads and parses it
4. Parsed transactions are saved to `transactions` table

### 🎯 Goal Mapping

- User maps one or more MF schemes to a financial goal
- Goal data saved to `goals` table, along with mapping to schemes

### 📊 Dashboard Display

- Transactions fetched by goal (via joined query)
- Data computed:
  - **Progress to goal**
  - **XIRR**
  - **Asset split**
- Displayed using `GoalCard`, `XirrChart`, `AllocationPie`

### 🧠 State Management Summary

| State                      | Location                  | Notes |
|---------------------------|---------------------------|-------|
| Auth state                | `UserContext`             | From Supabase session |
| Uploaded file             | `upload/page.tsx` local state | File preview + upload |
| Parsed transaction data   | Supabase DB (`transactions`) | Not stored client-side |
| Goal + mapping            | Supabase DB (`goals`)     | Fetched on dashboard load |
| XIRR & Allocation outputs | Computed on client        | Derived using `xirr.ts`, `assetAllocation.ts` |

## 🗃️ Supabase Database Schema (Simplified)

```sql
-- Users already handled by Supabase Auth

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  date date,
  scheme text,
  amount numeric,
  type text,
  nav numeric
);

CREATE TABLE goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  name text,
  target_amount numeric,
  target_date date
);

CREATE TABLE goal_scheme_mapping (
  goal_id uuid REFERENCES goals(id),
  scheme text
);
```

## 🔒 Supabase RLS Example

```sql
-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "User can access own transactions"
  ON transactions
  FOR SELECT USING (auth.uid() = user_id);
```

## 📈 XIRR Calculation (Simplified Sample)

```ts
// lib/xirr.ts
export function calculateXIRR(transactions: Transaction[], currentValue: number): number {
  // Filter purchase/redemption transactions and apply XIRR formula
  // Use Newton-Raphson method or a library like 'xirr'
  // Return XIRR as percentage
}
```

## 📌 Notes

- Use **Zod** for schema validation
- Add **loading spinners** for file uploads and dashboards
- Optional: Enable **cron job or webhook** for background re-parsing if needed
- Consider **React Query or SWR** for caching/fetching dashboard data
- For production: Secure storage access with **signed URLs** for PDFs
