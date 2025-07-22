'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/auth/login" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Login
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-gray-600 mt-2">Last updated: 22-July-2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose max-w-none text-gray-900">
            {/* Main title is already above; remove duplicate <h1> */}
            <p><strong>Effective Date:</strong> 22-July-2025</p>

            <p>Welcome to <strong>sipgoals.in</strong>. This website and its related services (&quot;Service&quot;) are operated by Roshan R Krishnan (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing or using the Service, you (&quot;you&quot;, &quot;user&quot;) agree to be bound by the following Terms of Service. Please read them carefully.</p>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">1. Eligibility</h2>
            <p>This Service is intended for use by Indian residents who are at least 18 years of age. By using this Service, you represent and warrant that you meet this requirement.</p>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">2. Nature of Service</h2>
            <p>sipgoals.in is a <strong>goal-based investment tracking tool</strong> designed to help Indian investors monitor and visualize their financial goals. We do <strong>not</strong> offer:</p>
            <ul>
              <li>Investment advisory services</li>
              <li>Mutual fund or stock distribution</li>
              <li>Brokerage services</li>
            </ul>
            <p>All information, including NAV, XIRR, and valuation metrics, is provided for informational and personal tracking purposes only.</p>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">3. User Accounts</h2>
            <p>To use the Service, you must create an account with accurate and complete information. You are responsible for maintaining the confidentiality of your credentials and all activities under your account.</p>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">4. User Data</h2>
            <ul>
              <li>Mutual fund data may be uploaded via CAMS CAS PDF statements.</li>
              <li>Stock and NPS data must be manually entered (automated support may be introduced later).</li>
              <li>Mutual fund NAVs are updated daily, NPS NAVs bi-weekly, and stock prices are updated approximately twice every hour.</li>
              <li>You retain ownership of your uploaded and entered data. We do not share or sell your data to third parties.</li>
            </ul>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">5. Acceptable Use</h2>
            <p>You agree <strong>not to</strong>:</p>
            <ul>
              <li>Use bots, scrapers, or automation to access or interact with the Service</li>
              <li>Engage in fraudulent, deceptive, or illegal activity</li>
              <li>Attempt to interfere with the platform’s normal operation</li>
              <li>Resell or commercially exploit any part of the Service without permission</li>
            </ul>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">6. Account Suspension or Termination</h2>
            <p>We reserve the right to suspend or terminate your access to the Service without notice if you engage in:</p>
            <ul>
              <li>Misuse of the Service</li>
              <li>Fraudulent or automated activity</li>
              <li>Violation of these Terms</li>
              <li>Spam, scams, or other harmful conduct</li>
            </ul>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">7. Paid Features</h2>
            <p>We may offer premium features or subscription plans in the future. All pricing and related terms will be disclosed at the time of offering.</p>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">8. Data Accuracy and Disclaimer</h2>
            <p>
              While we strive to maintain accurate and up-to-date data (e.g., NAV, stock prices, XIRR), the information provided is <strong>on a best-effort basis</strong> and may occasionally be stale, incomplete, or incorrect.
            </p>
            <ul>
              <li>We make <strong>no warranties or guarantees</strong> regarding:</li>
              <ul>
                <li>Accuracy or reliability of data</li>
                <li>Suitability of the Service for financial decision-making</li>
              </ul>
            </ul>
            <p>
              You agree that you use the Service at your own risk and that we are <strong>not liable for any investment losses or financial decisions</strong> based on the use of this platform.
            </p>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">9. Intellectual Property</h2>
            <p>All content on the Service, including software, design, and branding, is owned by or licensed to us. You may not copy, modify, or distribute any part of the platform without our prior consent.</p>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising out of your use of the Service.</p>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">11. Governing Law and Jurisdiction</h2>
            <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in <strong>Bangalore, Karnataka</strong>.</p>

            <h2 className="mt-8 text-blue-700 font-bold text-2xl">12. Contact Us</h2>
            <p>For any questions, support requests, or legal notices, contact us at:</p>
            <p><strong>Email:</strong> roshan at sipgoals.in</p>
          </div>
        </div>
      </div>
    </div>
  )
} 