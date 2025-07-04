'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/portfolio', label: 'Mutual Funds', icon: '💼' },
    { href: '/dashboard/stocks', label: 'Stocks', icon: '📈' },
    { href: '/dashboard/nps', label: 'NPS', icon: '🏛️' },
    { href: '/dashboard/goals/simulator', label: 'Goal Simulator', icon: '🎯' },
  ]

  useEffect(() => {
    setPendingRoute(null)
  }, [pathname])

  return (
    <div className="w-64 bg-gray-50 border-r min-h-screen">
      <div className="p-4">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const isPending = pendingRoute === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setPendingRoute(item.href)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors relative
                  ${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                  ${isPending && !isActive ? 'ring-2 ring-indigo-400 bg-indigo-50' : ''}
                  ${pendingRoute && !isActive ? 'pointer-events-none opacity-60' : ''}
                `}
                aria-disabled={!!pendingRoute && !isActive}
                tabIndex={!!pendingRoute && !isActive ? -1 : 0}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
                {isPending && !isActive && (
                  <span className="ml-2 animate-spin w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full inline-block align-middle"></span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
} 