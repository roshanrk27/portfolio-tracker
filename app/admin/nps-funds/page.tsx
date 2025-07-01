'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function NPSFundsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single()
          
          if (profileError) {
            console.error('Error fetching user profile:', profileError)
            setError(`Error checking admin status: ${profileError.message}`)
            return
          }
          
          if (profile?.role === 'admin') {
            setIsAdmin(true)
          } else {
            setError('Access denied: Admin privileges required')
          }
        } else {
          setError('No active session found')
        }
      } catch (err: any) {
        console.error('Exception in checkAdminStatus:', err)
        setError(`Exception checking admin status: ${err.message}`)
      }
    }
    checkAdminStatus()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('Please select a valid CSV file')
      setFile(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setIsUploading(true)
    setError(null)
    setResult(null)

    try {
      const text = await file.text()
      console.log('File content:', text)
      
      const lines = text.split('\n').filter(line => line.trim())
      console.log('Total lines:', lines.length)
      
      // Skip header row
      const dataLines = lines.slice(1)
      console.log('Data lines:', dataLines)
      
      const fundsData = dataLines.map(line => {
        const [fundName, fundCode] = line.split(',').map(field => field.trim())
        return {
          fund_name: fundName,
          fund_code: fundCode
        }
      }).filter(fund => fund.fund_name && fund.fund_code)

      console.log('Processed funds data:', fundsData)
      console.log('Number of valid funds:', fundsData.length)

      if (fundsData.length === 0) {
        throw new Error('No valid fund data found in CSV. Please check the format.')
      }

      // Upsert data with fund_code as unique constraint
      const { data, error } = await supabase
        .from('nps_funds')
        .upsert(fundsData, { 
          onConflict: 'fund_code',
          ignoreDuplicates: false 
        })

      console.log('Supabase response:', { data, error })

      if (error) {
        throw error
      }

      setResult({
        message: `Successfully uploaded ${fundsData.length} NPS funds`,
        data: fundsData
      })
      
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 border-b-2 border-blue-500 pb-2">
          NPS Fund Management
        </h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-lg">
            <div className="font-semibold text-red-900">Error:</div>
            <div className="mt-1">{error}</div>
          </div>
        )}
        
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8 border border-gray-200">
          <h2 className="text-xl font-bold mb-6 text-gray-800">
            Upload NPS Fund Mapping CSV
          </h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-2 text-sm text-gray-500">
              CSV format: fund_name, fund_code
            </p>
            <p className="mt-1 text-sm text-gray-400">
              New entries will be added only if the fund_code doesn't already exist
            </p>
          </div>
          
          <button
            onClick={handleUpload}
            disabled={isUploading || !file}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold text-lg transition-colors duration-200 shadow-md"
          >
            {isUploading ? 'Uploading...' : 'Upload Funds'}
          </button>

          {result && (
            <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-800 rounded-r-lg">
              <div className="font-semibold text-green-900">Success!</div>
              <div className="mt-1">{result.message}</div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <h2 className="text-xl font-bold mb-6 text-gray-800">
            About NPS Fund Upload
          </h2>
          <ul className="list-disc list-inside space-y-3 text-gray-700 text-lg">
            <li className="font-medium">Upload CSV with fund_name and fund_code columns</li>
            <li className="font-medium">Fund codes are used as unique identifiers</li>
            <li className="font-medium">New entries are added only if fund_code doesn't exist</li>
            <li className="font-medium">Existing entries with same fund_code are updated</li>
            <li className="font-medium">This mapping is used in the NPS holdings page</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 