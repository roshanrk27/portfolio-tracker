'use client'

import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [showHelpMenu, setShowHelpMenu] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleShowOnboarding = () => {
    if (typeof window !== 'undefined' && (window as { showOnboarding?: () => void }).showOnboarding) {
      (window as { showOnboarding?: () => void }).showOnboarding?.()
    }
    setShowHelpMenu(false)
  }

  return (
    <nav className="bg-gradient-to-br from-green-500 via-green-400 to-yellow-400 shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-white">
              Investment Goals Tracker
            </h1>
          </div>
          
          <div className="flex items-center space-x-6 ml-auto">
            {user && (
              <span className="text-sm text-white/90">
                {user.email}
              </span>
            )}
            
            {/* Help Menu */}
            <div className="relative">
              <button
                onClick={() => setShowHelpMenu(!showHelpMenu)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Help"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {showHelpMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                  <button
                    onClick={handleShowOnboarding}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Show Onboarding
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
} 