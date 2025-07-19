import Link from 'next/link'

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple navbar for guest pages */}
      <nav className="shadow-sm border-b bg-gradient-to-r from-blue-400 to-indigo-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="font-semibold text-base sm:text-lg md:text-xl lg:text-2xl text-white hover:text-blue-100 transition-colors">
                Investment Goals Tracker
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-white hover:text-blue-100 px-3 py-2 rounded-md transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-white text-blue-600 text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
} 