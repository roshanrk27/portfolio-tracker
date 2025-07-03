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
      setParsingStatus('Parsing file...')
      const parseResult = await parseUploadedFile(uploadData.id)
      
      if (parseResult.success) {
        setParsingStatus(`Parsed ${parseResult.count} transactions successfully!`)
        
        // Navigate to mutual funds page after successful upload and parsing
        setTimeout(() => {
          router.push('/dashboard/portfolio')
        }, 2000) // Give user 2 seconds to see the success message
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

              {uploadStatus && (
                <div className={`mb-4 p-3 rounded-lg border text-center ${
                  uploadStatus.includes('successfully') 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : uploadStatus.includes('failed') 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {uploadStatus}
                </div>
              )}

              {parsingStatus && (
                <div className={`mb-6 p-3 rounded-lg border text-center ${
                  parsingStatus.includes('successfully') 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : parsingStatus.includes('failed') 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {parsingStatus}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 mt-6">
                <button
                  type="submit"
                  disabled={!selectedFile || uploading || !!fileError}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 disabled:text-gray-400 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Upload file"
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
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
                  <li>Maximum file size: 10MB</li>
                </ul>
              </div>
            </form>
          </div>

          {/* Instructions Section */}
          <div className="lg:pl-4">
            <div className="bg-white rounded-lg shadow-md p-8 h-fit">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Get Your CAMS Statement</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">Step 1: Generate CAS Statement</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    Generate a detailed CAS statement from{' '}
                    <a 
                      href="https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      CAMS Online
                    </a>
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 ml-4">
                    <li>• Choose specific time frame that&apos;s after the latest available date shown above</li>
                    <li>• Select &quot;Transacted folios and folios with balance&quot; option</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">Step 2: Convert to CSV</h3>
                  <p className="text-sm text-green-800 mb-3">
                    Use the{' '}
                    <a 
                      href="https://github.com/SudheerNotes/cams2csv" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 underline font-medium"
                    >
                      CAMS2CSV tool
                    </a>
                    {' '}to convert the CAS statement to CSV format
                  </p>
                  <ul className="text-sm text-green-800 space-y-1 ml-4">
                    <li>• Download and install the CAMS2CSV tool</li>
                    <li>• Open your CAS PDF statement in the tool</li>
                    <li>• Export as CSV file</li>
                  </ul>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2">Step 3: Upload CSV</h3>
                  <p className="text-sm text-purple-800">
                    Upload the generated CSV file using the form on the left
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h3 className="font-semibold text-amber-900 mb-2">First Time Users</h3>
                  <p className="text-sm text-amber-800">
                    For first time users, get the CAS statement from as far back as your first investment to capture your complete transaction history.
                  </p>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Important Notes</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Always choose a date range after your latest transaction to avoid duplicates</li>
                  <li>• The CAMS2CSV tool is open source and safe to use</li>
                  <li>• Make sure to select &quot;Transacted folios and folios with balance&quot; for complete data</li>
                  <li>• CSV files should be under 10MB in size</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 