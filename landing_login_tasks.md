# 🛠️ Build Task: Two-Column Landing + Login Page for SIPGoals

This document outlines the tasks for transforming the current login page into a modern 2-pane landing + login screen that introduces SIPGoals to first-time users.

---

## 🎯 Goal

Make the login page more inviting and informative by adding:
- A feature-rich left panel (2/3 width)
- A clean, centered login panel on the right (1/3 width)

---

## ✅ Final Layout

### Desktop (2:1 Ratio)

```
+--------------------------------------------------------------+
|                     |                                        |
|   LEFT PANEL        |         RIGHT PANEL (LOGIN)           |
|   (2/3 width)       |         (1/3 width)                    |
|                     |                                        |
| Logo                |  Sign in to your account               |
| Headline            |  [ Email input ]                       |
| Subheadline         |  [ Password input ]                    |
| Feature bullets     |  [ Sign in button ]                    |
| Illustration        |  [ Google Sign-in button ]             |
|                     |  Don't have an account? Sign up        |
+--------------------------------------------------------------+
```

---

## 🧩 Step-by-Step Tasks

### 1. Set Up Grid Layout
- [ ] Use `grid grid-cols-1 md:grid-cols-3 min-h-screen` for responsive layout
- [ ] Left column: `md:col-span-2 bg-gray-50 p-10`
- [ ] Right column: `md:col-span-1 flex justify-center items-center p-8`

---

### 2. Left Panel Content (Value Prop)

#### a. Header and Branding
- [ ] Add app logo (`SIPGoals`) using brand font
- [ ] Add headline:
  ```
  🎯 Take control of your financial goals
  ```

- [ ] Add subheadline:
  ```
  Track all your investments — Mutual Funds, Stocks, and NPS — in one place. Built for Indian investors, designed for simplicity.
  ```

#### b. Feature Highlights
- [ ] Display with icons and short descriptions:
  - 📁 Upload CAMS statements
  - 🎯 Create & manage goals
  - 📊 Get Mutual Fund XIRR
  - 📈 Visual dashboards
  - 🔒 Secure & private

- [ ] Style as grid or stacked cards using Tailwind (e.g., `flex space-y-4 text-sm text-gray-700`)

#### c. Illustration Placeholder
- [ ] Add a placeholder image or screenshot (`/public/illustration.png`)
- [ ] Add `alt` text: “Dashboard preview showing SIPGoals features”

---

### 3. Right Panel (Login Form)

#### a. Layout
- [ ] Keep existing login form with inputs and buttons
- [ ] Center vertically using `flex justify-center items-center`

#### b. Google Sign-In
- [ ] Add a secondary button:
  ```tsx
  <button onClick={handleGoogleLogin} className="mt-4 w-full border border-gray-300 rounded px-4 py-2 hover:bg-gray-100">
    Sign in with Google
  </button>
  ```

#### c. Form Styling
- [ ] Use Tailwind classes:
  - Inputs: `rounded px-4 py-2 w-full border`
  - Button: `bg-indigo-600 text-white font-semibold hover:bg-indigo-700`

---

### 4. Mobile Responsiveness
- [ ] Use `grid-cols-1` on mobile (stacks vertically)
- [ ] Collapse features into 2 rows
- [ ] Hide illustration on screens < `md` breakpoint

---

### 5. Completion Criteria

- [ ] Layout uses 2:1 ratio on desktop
- [ ] Shows product features clearly
- [ ] Login form works as-is
- [ ] Google login integrated
- [ ] Responsive layout confirmed on mobile

---

This version should provide a modern first-touch experience that explains the value of SIPGoals and encourages sign-up.