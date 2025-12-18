import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-gray-50 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Track your</span>{' '}
                  <span className="block text-blue-600 xl:inline">investment goals</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Simple and powerful tool to set up, track, and simulate your investment goals. 
                  See how your SIP investments grow over time with realistic projections.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="rounded-md shadow">
                    <Link
                      href="/goals/simulator"
                      className="w-full flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-3 md:text-base md:px-8"
                    >
                      Try Goal Simulator
                    </Link>
                  </div>
                  <div className="rounded-md shadow">
                    <Link
                      href="/auth/signup"
                      className="w-full flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 md:py-3 md:text-base md:px-8"
                    >
                      Get Started Free
                    </Link>
                  </div>
                  <div className="rounded-md shadow">
                    <Link
                      href="/auth/login"
                      className="w-full flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 md:py-3 md:text-base md:px-8"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-r from-blue-400 to-indigo-500 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center lg:rounded-l-3xl">
            <div className="text-white text-center px-6">
              <h2 className="text-2xl font-bold mb-2">Investment Goal Tracking</h2>
              <p className="text-lg opacity-90 mb-4">Plan • Track • Achieve</p>
              <Link
                href="/articles"
                className="inline-flex items-center justify-center px-5 py-2.5 border border-white text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
              >
                Learn about goal-based investing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to track your goals
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Goal Tracking</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Set up multiple investment goals and track their progress over time with real-time updates.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Goal Simulator</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Simulate different investment scenarios with step-up SIPs and inflation adjustments.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Portfolio Tracking</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Track your mutual funds, stocks, and other investments in one place.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Personalized Insights</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Get insights based on your actual portfolio data and investment patterns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-700">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to start tracking?</span>
            <span className="block">Try our goal simulator today.</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-blue-200">
            See how your investments could grow over time with our powerful simulation tool.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/goals/simulator"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
            >
              Try Goal Simulator
            </Link>
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-blue-600"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
