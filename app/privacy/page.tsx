'use client'

import Link from 'next/link'

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600 mt-2">Last updated: 22-July-2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose max-w-none text-gray-900">
            {/* Main title is already above; remove duplicate <h1> */}
  <p><strong>Effective Date:</strong> 22-July-2025</p>

  <p>This Privacy Policy explains how we collect, use, store, and protect your information when you use <strong>sipgoals.in</strong>, operated by Roshan R Krishnan (“we”, “us”, or “our”). By using the Service, you agree to the practices described below.</p>

  <h2 className="mt-8 text-blue-700 font-bold text-2xl">1. Information We Collect</h2>
  <p>We collect the following information from users:</p>
  <ul>
    <li><strong>Account Data:</strong> Email address and password when you sign up</li>
    <li><strong>Uploaded Files:</strong> CAMS CAS PDF files voluntarily uploaded by you</li>
    <li><strong>Manually Entered Data:</strong> Stock and NPS investment entries you provide</li>
    <li><strong>Usage Data:</strong> Technical logs (browser, device info, IP address) for analytics and abuse prevention</li>
  </ul>

  <h2 className="mt-8 text-blue-700 font-bold text-2xl">2. How We Use Your Data</h2>
  <p>We use your data to:</p>
  <ul>
    <li>Operate and provide the core portfolio tracking features</li>
    <li>Calculate NAV, XIRR, and progress toward financial goals</li>
    <li>Improve user experience and fix issues</li>
    <li>Prevent misuse, bots, or fraud</li>
    <li>Send occasional communications about updates or features (opt-out available)</li>
  </ul>

  <h2 className="mt-8 text-blue-700 font-bold text-2xl">3. Data Sharing & Disclosure</h2>
  <p>We do <strong>not</strong> sell or rent your data. We may share data only when:</p>
  <ul>
    <li>Required by Indian law, court order, or government request</li>
    <li>Necessary for debugging or service operations with infrastructure partners (e.g., Supabase, Vercel)</li>
  </ul>

  <h2 className="mt-8 text-blue-700 font-bold text-2xl">4. Cookies and Analytics</h2>
  <p>We may use cookies and analytics tools (like Vercel Analytics or self-hosted tools) to understand usage trends. No third-party marketing or ad trackers are used.</p>

  <h2 className="mt-8 text-blue-700 font-bold text-2xl">5. Data Storage and Security</h2>
  <p>Your data is stored securely in Supabase with encryption and row-level security. We apply standard safeguards including:</p>
  <ul>
    <li>Encrypted storage and transfer (HTTPS, TLS)</li>
    <li>Access control policies to isolate user data</li>
    <li>Regular updates to infrastructure and libraries to mitigate known vulnerabilities</li>
  </ul>

  <h2 className="mt-8 text-blue-700 font-bold text-2xl">6. Data Retention</h2>
  <p>Your uploaded data is retained as long as your account is active. You may request deletion of your data by emailing <strong>roshan@sipgoals.in</strong>. Deleted data may persist in secure backups for a short period as part of disaster recovery systems.</p>

  <h2 className="mt-8 text-blue-700 font-bold text-2xl">7. User Rights</h2>
  <p>You have the right to:</p>
  <ul>
    <li>Access or export your stored data</li>
    <li>Correct inaccurate entries in your account</li>
    <li>Delete your account and all associated data</li>
    <li>Withdraw consent for optional features at any time</li>
  </ul>
  <p>Email <strong>roshan@sipgoals.in</strong> to exercise these rights.</p>

  <h2 className="mt-8 text-blue-700 font-bold text-2xl">8. Children&apos;s Privacy</h2>
  <p>This service is not intended for individuals under 18. We do not knowingly collect data from minors.</p>

  <h2 className="mt-8 text-blue-700 font-bold text-2xl">9. Changes to this Policy</h2>
  <p>We may update this Privacy Policy occasionally. If significant changes are made, we will notify users via email or through the platform interface.</p>

  <h2 className="mt-8 text-blue-700 font-bold text-2xl">10. Contact</h2>
  <p>If you have questions or concerns, contact:</p>
  <p><strong>Email:</strong> roshan at sipgoals.in</p>
          </div>
        </div>
      </div>
    </div>
  )
} 