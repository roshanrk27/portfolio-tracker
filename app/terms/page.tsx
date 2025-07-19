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
          <p className="text-gray-600 mt-2">Last updated: [Date]</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose max-w-none">
            {/* PLACEHOLDER CONTENT - REPLACE WITH YOUR ACTUAL TERMS OF SERVICE */}
            <p className="text-gray-500 italic">
              This is a placeholder for your Terms of Service content. 
              Please replace this section with your actual Terms of Service.
            </p>
            
            <h2>1. Acceptance of Terms</h2>
            <p>
              [Your terms content will go here. You can use HTML formatting like this paragraph.]
            </p>

            <h2>2. Use of Service</h2>
            <p>
              [Add your service usage terms here.]
            </p>

            <h2>3. User Responsibilities</h2>
            <p>
              [Add user responsibility terms here.]
            </p>

            <h2>4. Privacy</h2>
            <p>
              [Reference to privacy policy and data handling terms.]
            </p>

            <h2>5. Limitation of Liability</h2>
            <p>
              [Add liability limitations here.]
            </p>

            <h2>6. Contact Information</h2>
            <p>
              [Add your contact information for questions about these terms.]
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 