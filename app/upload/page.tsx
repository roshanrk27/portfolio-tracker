'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { parseUploadedFile } from './parse'
import { fileUploadSchema, formatValidationErrors } from '@/lib/validation'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [parsingStatus, setParsingStatus] = useState('')
  const [fileError, setFileError] = useState('')
  const router = useRouter()

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
      } catch (err: any) {
        if (err.name === 'ZodError') {
          const errorMessage = formatValidationErrors(err)
          setFileError(errorMessage)
        } else {
          setFileError('Invalid file selected')
        }
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
    // Navigate back to dashboard
    router.push('/dashboard')
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
      const { data: storageData, error: storageError } = await supabase.storage
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
      } else {
        setParsingStatus(`Parsing failed: ${parseResult.error}`)
      }

      setSelectedFile(null)
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }

    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadStatus(`Upload failed: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
      <div className="w-full max-w-lg mx-auto bg-white rounded-3xl shadow-2xl p-0 md:p-0 border border-gray-200 relative">
        {/* Title and subtitle */}
        <div className="rounded-t-3xl px-8 pt-8 pb-4 bg-gradient-to-b from-blue-50 to-white border-b border-gray-100">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1">Upload CAMS Statement</h1>
          <p className="text-base md:text-lg text-blue-700 font-medium mb-0">Upload your mutual fund transaction statement to track your portfolio</p>
        </div>

        <form className="px-8 pt-6 pb-8" onSubmit={e => { e.preventDefault(); handleUpload(); }}>
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

          <div className="flex flex-col md:flex-row gap-4 mt-2">
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
              aria-label="Cancel and return to dashboard"
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
    </div>
  )
} 