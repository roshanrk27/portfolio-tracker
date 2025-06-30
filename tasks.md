# ✅ MVP Build Tasks

### 1. Initialize Next.js app with App Router
Create a new Next.js project with TypeScript and App Router enabled

### 2. Set up Supabase project
Create Supabase project, configure DB and storage buckets

### 3. Install and configure Supabase client
Add @supabase/supabase-js and initialize in lib/supabaseClient.ts

### 4. Implement Supabase auth (email/password)
Create login and sign-up pages using Supabase email auth

### 5. Protect dashboard route with auth check
Ensure /dashboard route redirects unauthenticated users to /auth/login

### 6. Build layout with navbar and sidebar
Create layout.tsx with Navbar and Sidebar components

### 7. Create dashboard page shell
Add /dashboard/page.tsx with placeholder GoalCards

### 8. Add file upload page shell
Add /upload/page.tsx with basic file input and button

### 9. Implement PDF file upload to Supabase storage
Allow users to select CSV and upload to Supabase

### 10. Store file metadata in DB
Save file name, upload date, user_id in a new 'uploads' table

### 11. Build server action or API to parse uploaded CAMS PDF
Read uploaded file and extract transaction table

### 12. Extract transactions and store in Supabase
Parse CSV rows into structured transactions and save

### 13. Test parsing with multiple CAMS formats
Ensure robust handling of real-world variation

### 14. Create goals table in Supabase
Define schema with id, name, amount, date, user_id

### 15. Build GoalForm component
Create a form for entering new goals

### 16. Submit new goal to Supabase
Use Supabase client to insert into goals table

### 17. Render goals on dashboard
Query and display each goal with a basic progress bar

### 18. Create goal-scheme mapping table
Schema linking goal_id to scheme name

### 19. UI to map scheme to goal
Build a dropdown selector per goal with available schemes

### 20. Store mapping to DB
Insert goal_id and scheme in mapping table

### 21. Implement XIRR calculation ✅
Use custom xirr.ts function with test cases

### 22. Calculate asset allocation
Parse schemes into equity/debt/hybrid using rules

### 23. Show XIRR and allocation in dashboard
Display per goal insights using charts

### 24. Add AllocationPie chart ✅
Pie chart showing asset split for mapped schemes

### 25. Add XirrChart for each goal ✅
Line chart showing investment growth over time

### 26. Add RLS policies for each table ✅
Ensure only user's own data is visible and writable

### 27. Add Zod validation to forms ✅
Validate goal inputs and upload logic

### 28. Test full MVP flow end-to-end
Login → Upload → Parse → Map to Goal → View Insights

### 29. Implement consistent design system ✅
Modern modal styling, form improvements, and consistent UI patterns
