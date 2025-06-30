'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { parseUploadedFile } from './parse'

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [parsingStatus, setParsingStatus] = useState('')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadStatus('')
      setParsingStatus('')
    }
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Upload CAMS Statement</h1>
      
      <div className="bg-white rounded-lg shadow p-8 border">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CAMS CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>

        {selectedFile && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Selected file:</strong> {selectedFile.name}
            </p>
            <p className="text-sm text-gray-500">
              Size: {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        )}

        {uploadStatus && (
          <div className={`mb-4 p-4 rounded-md ${
            uploadStatus.includes('successfully') 
              ? 'bg-green-50 text-green-700' 
              : uploadStatus.includes('failed') 
                ? 'bg-red-50 text-red-700' 
                : 'bg-blue-50 text-blue-700'
          }`}>
            {uploadStatus}
          </div>
        )}

        {parsingStatus && (
          <div className={`mb-6 p-4 rounded-md ${
            parsingStatus.includes('successfully') 
              ? 'bg-green-50 text-green-700' 
              : parsingStatus.includes('failed') 
                ? 'bg-red-50 text-red-700' 
                : 'bg-blue-50 text-blue-700'
          }`}>
            {parsingStatus}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>

        <div className="mt-6 text-sm text-gray-600">
          <h3 className="font-medium mb-2">Instructions:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Upload your CAMS Consolidated MF Transaction Statement in CSV format</li>
            <li>Make sure the file contains transaction data with scheme names, amounts, and dates</li>
            <li>File will be processed to extract your mutual fund transactions</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 