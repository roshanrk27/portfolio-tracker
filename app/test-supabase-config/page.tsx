'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TestSupabaseConfigPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const testResetEmail = async () => {
    setLoading(true)
    setResult('')

    try {
      console.log('Testing reset email for:', email)
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      console.log('Current origin:', origin)
      console.log('Redirect URL:', `${origin}/auth/reset-password`)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      })

      if (error) {
        setResult(`Error: ${error.message}`)
        console.error('Reset email error:', error)
      } else {
        setResult('Reset email sent successfully! Check your email.')
        console.log('Reset email sent successfully')
      }
    } catch (err) {
      setResult(`Unexpected error: ${err}`)
      console.error('Unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6">Supabase Config Test</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>

          <button
            onClick={testResetEmail}
            disabled={loading || !email}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Test Reset Email'}
          </button>

          {result && (
            <div className={`p-3 rounded-md ${
              result.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {result}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium mb-2">Debug Info:</h3>
          <p className="text-sm text-gray-600">
            Current Origin: {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
          </p>
          <p className="text-sm text-gray-600">
            Redirect URL: {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/reset-password
          </p>
        </div>
      </div>
    </div>
  )
} 