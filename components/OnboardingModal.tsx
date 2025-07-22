'use client'

import { markOnboardingAsSeen } from '@/lib/onboardingUtils'

interface OnboardingModalProps {
  onClose: () => void
}

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const handleDismiss = async () => {
    try {
      // Mark onboarding as seen in database
      await markOnboardingAsSeen()
      // Close the modal
      onClose()
    } catch (error) {
      console.error('Error marking onboarding as seen:', error)
      // Still close the modal even if database update fails
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">🎉 Welcome to SIP Goals</h2>
          <button
            onClick={handleDismiss}
            className="text-neutral-500 hover:text-neutral-800 p-2 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-sm text-gray-600 space-y-6">
          <p>
            Your personal dashboard to plan and track your investments — all in one place.
          </p>

          <div>
            <h3 className="text-lg font-medium mt-4 text-gray-900 mb-3">🔍 What you can do here</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-lg">✅</span>
                <div>
                  <span className="font-medium text-gray-900">Create financial goals</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Define goals like Retirement, Home Purchase, or Child&apos;s Education and track your progress toward them.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-600 text-lg">✅</span>
                <div>
                  <span className="font-medium text-gray-900">Map your investments to goals</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Assign your Mutual Funds, Stocks, and NPS holdings to specific goals and see how close you are to your targets.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-600 text-lg">✅</span>
                <div>
                  <span className="font-medium text-gray-900">Understand your mutual fund performance</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Track Mutual Fund growth and returns over time using XIRR and visual progress charts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-green-600 text-lg">✅</span>
                <div>
                  <span className="font-medium text-gray-900">See asset allocation clearly</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Get a breakdown of your portfolio by asset class — Equity, Debt, and NPS — all in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mt-4 text-gray-900 mb-3">🚀 How to get started</h3>
            
            <div className="space-y-4">
              <div>
                <span className="font-medium text-gray-900">1. Upload your Mutual Fund data</span>
                <p className="text-sm text-gray-600 mt-1">
                  Go to the Upload section and upload your CAMS CAS PDF file to automatically extract all your transactions.
                </p>
              </div>

              <div>
                <span className="font-medium text-gray-900">2. Add your Stock and NPS holdings</span>
                <p className="text-sm text-gray-600 mt-1">
                  Enter your stock and NPS investments manually via the Stocks and NPS sections.
                </p>
              </div>

              <div>
                <span className="font-medium text-gray-900">3. Create your goals and map investments</span>
                                  <p className="text-sm text-gray-600 mt-1">
                    Add your financial goals and assign investments to them. You&apos;ll instantly see how your investments are contributing toward each goal.
                  </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">🔐 Your data stays private</h3>
            <p className="text-sm text-blue-800">
              Your information is secure and visible only to you. Supabase Auth and row-level security keep your data safe and isolated.
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={handleDismiss}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
} 