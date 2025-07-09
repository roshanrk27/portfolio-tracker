'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { parseUploadedFile } from './parse'
import { fileUploadSchema } from '@/lib/validation'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [parsingStatus, setParsingStatus] = useState('')
  const [portfolioStatus, setPortfolioStatus] = useState('')
  const [fileError, setFileError] = useState('')
  const [earliestDate, setEarliestDate] = useState<string | null>(null)
  const [latestDate, setLatestDate] = useState<string | null>(null)
  const [loadingDates, setLoadingDates] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchTransactionDateRange()
  }, [])

  const fetchTransactionDateRange = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('transactions')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching transaction dates:', error)
        return
      }

      if (data && data.length > 0) {
        setEarliestDate(data[0].date)
        setLatestDate(data[data.length - 1].date)
      }
    } catch (error) {
      console.error('Error in fetchTransactionDateRange:', error)
    } finally {
      setLoadingDates(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setFileError('')
    setUploadStatus('')
    setParsingStatus('')
    setPortfolioStatus('')
    
    if (file) {
      try {
        // Validate file with Zod
        fileUploadSchema.parse({ file })
        setSelectedFile(file)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Invalid file selected'
        setFileError(errorMessage)
        setSelectedFile(null)
      }
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setFileError('')
    setUploadStatus('')
    setParsingStatus('')
    setPortfolioStatus('')
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
    // Navigate back to mutual funds page
    router.push('/dashboard/portfolio')
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadStatus('Uploading file...')
    setParsingStatus('')
    setPortfolioStatus('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `${timestamp}-${selectedFile.name}`

      // Upload file to Supabase storage
      const { error: storageError } = await supabase.storage
        .from('uploads')
        .upload(fileName, selectedFile)

      if (storageError) {
        throw storageError
      }

      // Store file metadata in database
      const { data: uploadData, error: dbError } = await supabase
        .from('uploads')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          storage_path: fileName,
          file_size: selectedFile.size,
          upload_date: new Date().toISOString(),
          status: 'uploaded'
        })
        .select()
        .single()

      if (dbError) {
        throw dbError
      }

      setUploadStatus('File uploaded successfully!')
      
      // Parse the uploaded file
      setParsingStatus('Parsing transactions...')
      const parseResult = await parseUploadedFile(uploadData.id)
      
      if (parseResult.success) {
        setParsingStatus(`Parsed ${parseResult.count} transactions successfully!`)
        
        // Handle portfolio refresh status
        if (parseResult.portfolioRefreshed) {
          setPortfolioStatus('Portfolio values updated with latest NAV data!')
        } else if (parseResult.portfolioError) {
          setPortfolioStatus('Portfolio value calculation failed. Will update during next NAV refresh.')
          console.error('Portfolio refresh error:', parseResult.portfolioError)
        } else {
          setPortfolioStatus('Portfolio refresh completed.')
        }
        
        // Navigate to mutual funds page after successful upload and parsing
        setTimeout(() => {
          router.push('/dashboard/portfolio')
        }, 3000) // Give user 3 seconds to see all status messages
      } else {
        setParsingStatus(`Parsing failed: ${parseResult.error}`)
      }

      setSelectedFile(null)
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Upload error:', errorMessage)
      setUploadStatus(`Upload failed: ${errorMessage}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload CAMS Statement</h1>
          <p className="text-gray-600">Upload your mutual fund transaction statement to track your portfolio</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <div>
            <form className="bg-white rounded-lg shadow-md p-8" onSubmit={e => { e.preventDefault(); handleUpload(); }}>
              <div className="mb-6">
                <label htmlFor="cams-file" className="block text-sm font-semibold text-gray-700 mb-3">
                  Select CAMS CSV File
                </label>
                <input
                  id="cams-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  aria-label="Select CAMS CSV file"
                  className={`block w-full text-sm text-gray-700 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${fileError ? 'border-red-500' : 'border-gray-200'}`}
                />
                {fileError && (
                  <p className="mt-2 text-sm text-red-600">{fileError}</p>
                )}
              </div>

              {/* Transaction Date Range */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Transaction Date Range</h3>
                {loadingDates ? (
                  <p className="text-sm text-gray-500">Loading transaction dates...</p>
                ) : earliestDate && latestDate ? (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Earliest:</span> {new Date(earliestDate).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Latest:</span> {new Date(latestDate).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Upload a CSV file with transactions from after {new Date(latestDate).toLocaleDateString('en-IN')} to avoid duplicates
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No existing transactions found. You can upload your first statement.</p>
                )}
              </div>

              {selectedFile && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Selected file:</strong> {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}

              {/* Status Messages */}
              {(uploadStatus || parsingStatus || portfolioStatus) && (
                <div className="mb-6 space-y-2">
                  {uploadStatus && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">{uploadStatus}</p>
                    </div>
                  )}
                  {parsingStatus && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">{parsingStatus}</p>
                    </div>
                  )}
                  {portfolioStatus && (
                    <div className={`p-3 border rounded-lg ${
                      portfolioStatus.includes('failed') 
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <p className={`text-sm ${
                        portfolioStatus.includes('failed') 
                          ? 'text-orange-800' 
                          : 'text-green-800'
                      }`}>{portfolioStatus}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 mt-6">
                <button
                  type="submit"
                  disabled={!selectedFile || uploading || !!fileError}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 disabled:text-gray-400 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Upload file"
                >
                  {uploading ? 'Processing...' : 'Upload File'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={uploading}
                  className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  aria-label="Cancel and return to mutual funds page"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-8 p-5 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Instructions:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>Upload your CAMS Consolidated MF Transaction Statement in CSV format</li>
                  <li>Make sure the file contains transaction data with scheme names, amounts, and dates</li>
                  <li>File will be processed to extract your mutual fund transactions</li>
                  <li>Portfolio values will be automatically updated with latest NAV data</li>
                  <li>Maximum file size: 10MB</li>
                </ul>
              </div>
            </form>
          </div>

          {/* Instructions Section */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">What happens after upload?</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">File Upload</h3>
                  <p className="text-sm text-gray-600">Your CSV file is securely uploaded and stored</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 text-xs font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Transaction Parsing</h3>
                  <p className="text-sm text-gray-600">System extracts and validates your mutual fund transactions</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Portfolio Update</h3>
                  <p className="text-sm text-gray-600">Latest NAV data is applied to calculate current portfolio values</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-xs font-bold">4</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Ready to View</h3>
                  <p className="text-sm text-gray-600">Your updated portfolio is ready to view in the dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 