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
          <p className="text-gray-600 mt-2">Last updated: [Date]</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose max-w-none">
            {/* PLACEHOLDER CONTENT - REPLACE WITH YOUR ACTUAL PRIVACY POLICY */}
            <p className="text-gray-500 italic">
              This is a placeholder for your Privacy Policy content. 
              Please replace this section with your actual Privacy Policy.
            </p>
            
            <h2>1. Information We Collect</h2>
            <p>
              [Describe what personal information you collect from users.]
            </p>

            <h2>2. How We Use Your Information</h2>
            <p>
              [Explain how you use the collected information.]
            </p>

            <h2>3. Information Sharing</h2>
            <p>
              [Describe if and how you share user information with third parties.]
            </p>

            <h2>4. Data Security</h2>
            <p>
              [Explain your data security measures.]
            </p>

            <h2>5. Cookies and Tracking</h2>
            <p>
              [Describe your use of cookies and tracking technologies.]
            </p>

            <h2>6. Your Rights</h2>
            <p>
              [Explain user rights regarding their personal data.]
            </p>

            <h2>7. Changes to This Policy</h2>
            <p>
              [Explain how and when you update this privacy policy.]
            </p>

            <h2>8. Contact Us</h2>
            <p>
              [Provide contact information for privacy-related questions.]
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 