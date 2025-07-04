# 🛠️ Build Task: First-Time User Onboarding Modal – SIP Goals

This document outlines the step-by-step tasks for implementing a first-time user onboarding modal for the SIP Goals application.

---

## 🎯 Goal

Display a modal to **first-time users** explaining what SIP Goals does and how to get started. It should:
- Show automatically on first login
- Use clean, modern UI (Tailwind CSS)
- Include the onboarding copy provided below
- Allow user to dismiss and not show again

---

## ✅ Onboarding Copy (to use in modal)

```
🎉 Welcome to SIP Goals

Your personal dashboard to plan and track your investments — all in one place.

🔍 What you can do here

✅ Create financial goals
Define goals like Retirement, Home Purchase, or Child's Education and track your progress toward them.

✅ Map your investments to goals
Assign your Mutual Funds, Stocks, and NPS holdings to specific goals and see how close you are to your targets.

✅ Understand your mutual fund performance
Track Mutual Fund growth and returns over time using XIRR and visual progress charts.

✅ See asset allocation clearly
Get a breakdown of your portfolio by asset class — Equity, Debt, and NPS — all in one place.

🚀 How to get started

1. Upload your Mutual Fund data
   Go to the Upload section and upload your CAMS CAS CSV file to automatically extract all your transactions.

2. Add your Stock and NPS holdings
   Enter your stock and NPS investments manually via the Stocks and NPS sections.

3. Create your goals and map investments
   Add your financial goals and assign investments to them. You’ll instantly see how your investments are contributing toward each goal.

🔐 Your data stays private
Your information is secure and visible only to you. Supabase Auth and row-level security keep your data safe and isolated.
```

---

## 🧩 Step-by-Step Tasks

### 1. Detect First-Time User
- [ ] Add a flag to Supabase `user_profiles` table: `has_seen_onboarding` (boolean, default: `false`)
- [ ] On user login, fetch this flag
- [ ] Show onboarding modal **only if flag is false**

### 2. Modal UI Component
- [ ] Create a reusable `OnboardingModal.tsx` in `components/`
- [ ] Use `@/components/ui/dialog` or `headlessui/react` or `@radix-ui/react-dialog`
- [ ] Style with Tailwind:
  - Rounded corners
  - Max width `max-w-xl`
  - Responsive padding and scrollable on small screens
  - Bold title (`text-2xl font-semibold`)
  - Section subtitles (`text-lg font-medium mt-4`)
  - Body text (`text-sm text-gray-600`)
- [ ] Include the onboarding copy exactly as written

### 3. Add Close and Dismiss Controls
- [ ] Include “Got it” button to dismiss the modal
- [ ] On click:
  - Hide modal
  - Call Supabase update to set `has_seen_onboarding = true`

### 4. Integrate in App
- [ ] Add logic to `layout.tsx` or `ReactQueryProvider.tsx` to fetch user profile on mount
- [ ] Conditionally render `<OnboardingModal />` only if flag is `false`

### 5. Optional Enhancements
- [ ] Add fade-in animation on mount (`transition-opacity`)
- [ ] Add basic analytics event: `onboarding_shown`, `onboarding_dismissed`
- [ ] Cache modal dismissal state in local storage until session reload

---

## ✅ Completion Criteria

- Modal is shown once to first-time users only
- Styled clearly and responsively
- Includes the onboarding content
- Updates user state on dismissal