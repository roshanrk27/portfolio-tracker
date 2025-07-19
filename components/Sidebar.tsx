'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  // Collapse sidebar by default on all screen sizes
  useEffect(() => {
    setCollapsed(true)
  }, [])

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
    <div
      className={`bg-gray-50 border-r min-h-screen transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ position: 'relative' }}
    >
      {/* Toggle Button */}
      <button
        className="absolute -right-3 top-4 z-20 w-7 h-7 bg-[#CEEBFB] rounded-full shadow flex items-center justify-center focus:outline-none"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        tabIndex={0}
      >
        <span className={`transform transition-transform duration-200 text-xl`} style={{ color: '#38809e' }}>
          {collapsed ? '▶' : '◀'}
        </span>
      </button>
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
                  ${collapsed ? 'justify-center' : ''}
                `}
                aria-disabled={!!pendingRoute && !isActive}
                tabIndex={!!pendingRoute && !isActive ? -1 : 0}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {!collapsed && item.label}
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