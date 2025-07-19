'use client'

import { useState } from 'react'

// Import the parsing function (we'll need to extract it from the server-side file)
// For now, we'll create a client-side version

interface ParsedTransaction {
  date: string
  scheme: string
  folio_number: string
  isin: string
  amount: number
  type: string
  nav: number
  units: number
  unit_balance: number
}

// Client-side version of the parsing functions
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

function extractFolioNumber(folioText: string): string {
  // Match pattern like "Folio No: 910113429126 / 0"
  const folio = folioText.match(/Folio\s*No:\s*([\d]+)\s*\/\s*(\d+)/)
  if (folio) {
    return `${folio[1]}/${folio[2]}`
  }

  // Fallback: extract plain number
  const fallback = folioText.match(/\d{6,}/)
  return fallback ? fallback[0] : ''
}

function extractISINFromScheme(schemeText: string) {
  // Match ISIN: 2 uppercase letters followed by 9 alphanumeric characters
  const isinMatch = schemeText.match(/[A-Z]{2}[A-Z0-9]{10}/)
  const isin = isinMatch ? isinMatch[0] : ''

  // Clean scheme name:
  // 1. Remove trailing ' - ISIN: ...' if present
  // 2. Remove anything from '(Advisor:' onwards
  const schemeName = schemeText
    .split(' - ISIN')[0]
    .replace(/\(Advisor:.*$/, '')
    .trim()

  return {
    schemeName,
    isin
  }
}

function extractSchemeName(schemeText: string): string {
  // Step 1: Remove everything after ' - ISIN' or '('
  const cleaned = schemeText.split(/ - ISIN|\(/)[0].trim()

  // Step 2: Remove prefix code like "128TSDGG-" or "P8145-"
  const parts = cleaned.split('-')
  const withoutPrefix = parts.length > 1 ? parts.slice(1).join('-').trim() : cleaned

  // Step 3: Split into major sections using ' - ' and extract 2nd, 3rd, 4th components
  const subparts = withoutPrefix.split(' - ')
  if (subparts.length >= 3) {
    return subparts.slice(0, 3).join(' - ').trim()
  }

  // Fallback: return whatever is left
  return withoutPrefix
}

function parseCAMSCSV(csvContent: string): ParsedTransaction[] {
  const lines = csvContent.split('\n')
  const transactions: ParsedTransaction[] = []

  console.log('=== CSV PARSER DEBUG START ===')
  console.log('Total lines in CSV:', lines.length)
  console.log('Raw CSV content length:', csvContent.length)
  console.log('First 200 chars of CSV:', csvContent.substring(0, 200))

  // Skip header lines and find transaction data
  let inTransactionSection = false
  let headers: string[] = []
  let headerLineIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    console.log(`Line ${i}: "${line}"`)
    
    // Look for transaction table header
    if (line.includes('Transaction Date') || line.includes('Scheme Name') || line.includes('Amount')) {
      inTransactionSection = true
      headerLineIndex = i
      headers = line.split(',').map(h => h.trim().replace(/"/g, ''))
      console.log('✅ Found transaction header at line', i)
      console.log('Headers found:', headers)
      console.log('Header count:', headers.length)
      continue
    }

    if (inTransactionSection && line && !line.includes('Total') && !line.includes('Grand Total')) {
      console.log(`\n--- Processing transaction line ${i} ---`)
      console.log('Raw line:', `"${line}"`)
      
      const values = parseCSVLine(line)
      console.log('Parsed values count:', values.length)
      console.log('Parsed values:', values.map((v, idx) => `${idx}: "${v}"`))
      
      if (values.length >= 6) {
        console.log('✅ Line has enough columns (>=6)')
        
        const rawFolio = values[0]?.trim() || ''
        const rawScheme = values[1]?.trim() || ''
        const rawDate = values[2]?.trim() || ''
        const rawType = values[3]?.trim() || ''
        const rawAmount = values[4]?.trim() || ''
        const rawUnits = values[5]?.trim() || ''
        const rawNav = values[6]?.trim() || ''
        const rawUnitBalance = values[7]?.trim() || ''
        
        console.log('Raw field values:')
        console.log('  Folio:', `"${rawFolio}"`)
        console.log('  Scheme:', `"${rawScheme}"`)
        console.log('  Date:', `"${rawDate}"`)
        console.log('  Type:', `"${rawType}"`)
        console.log('  Amount:', `"${rawAmount}"`)
        console.log('  Units:', `"${rawUnits}"`)
        console.log('  NAV:', `"${rawNav}"`)
        console.log('  Unit Balance:', `"${rawUnitBalance}"`)
        
        const schemeInfo = extractISINFromScheme(rawScheme)
        console.log('Scheme info extraction:', schemeInfo)
        
        const schemeName = extractSchemeName(rawScheme)
        console.log('Extracted scheme name:', `"${schemeName}"`)
        
        const folioNumber = extractFolioNumber(rawFolio)
        console.log('Extracted folio number:', `"${folioNumber}"`)
        
        const amount = parseFloat(rawAmount.replace(/[^\d.-]/g, '') || '0')
        const nav = parseFloat(rawNav.replace(/[^\d.-]/g, '') || '0')
        const units = parseFloat(rawUnits.replace(/[^\d.-]/g, '') || '0')
        const unitBalance = parseFloat(rawUnitBalance.replace(/[^\d.-]/g, '') || '0')
        
        console.log('Parsed numeric values:')
        console.log('  Amount:', amount)
        console.log('  NAV:', nav)
        console.log('  Units:', units)
        console.log('  Unit Balance:', unitBalance)
        
        const transaction: ParsedTransaction = {
          date: rawDate,
          scheme: schemeName,
          folio_number: folioNumber,
          isin: schemeInfo.isin,
          amount: amount,
          type: rawType,
          nav: nav,
          units: units,
          unit_balance: unitBalance
        }
        console.log('Constructed transaction:', transaction)

        // Validation checks
        const hasDate = !!transaction.date
        const hasScheme = !!transaction.scheme
        const hasNonZeroAmount = transaction.amount !== 0
        
        console.log('Validation results:')
        console.log('  Has date:', hasDate, `("${transaction.date}")`)
        console.log('  Has scheme:', hasScheme, `("${transaction.scheme}")`)
        console.log('  Has non-zero amount:', hasNonZeroAmount, `(${transaction.amount})`)

        // Only add valid transactions
        if (hasDate && hasScheme && hasNonZeroAmount) {
          console.log('✅ Transaction is VALID - adding to results')
          transactions.push(transaction)
        } else {
          console.log('❌ Transaction is INVALID - skipping')
          console.log('  Missing date:', !hasDate)
          console.log('  Missing scheme:', !hasScheme)
          console.log('  Zero amount:', !hasNonZeroAmount)
        }
      } else {
        console.log('❌ Line has insufficient columns (<6)')
        console.log('Expected at least 6 columns, got:', values.length)
      }
    } else if (inTransactionSection) {
      console.log(`Line ${i}: Skipped (contains "Total" or "Grand Total")`)
    } else {
      console.log(`Line ${i}: Not in transaction section yet`)
    }
  }

  console.log('\n=== PARSING SUMMARY ===')
  console.log('Header found at line:', headerLineIndex)
  console.log('Transaction section started:', inTransactionSection)
  console.log('Total lines processed:', lines.length)
  console.log('Valid transactions found:', transactions.length)
  console.log('Final transaction count:', transactions.length)
  console.log('=== CSV PARSER DEBUG END ===\n')
  
  return transactions
}

export default function TestCSVParser() {
  const [csvContent, setCsvContent] = useState('')
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const handleTestParse = () => {
    try {
      setIsProcessing(true)
      setError('')
      setDebugLogs([])
      
      if (!csvContent.trim()) {
        setError('Please enter CSV content to test')
        return
      }

      // Capture console.log output
      const originalConsoleLog = console.log
      const logs: string[] = []
      console.log = (...args: unknown[]) => {
        logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '))
        originalConsoleLog(...args)
      }

      const transactions = parseCAMSCSV(csvContent)
      
      // Restore console.log
      console.log = originalConsoleLog
      
      setDebugLogs(logs)
      setParsedTransactions(transactions)
      
      if (transactions.length === 0) {
        setError('No valid transactions found in the CSV content')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Parsing error: ${errorMessage}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClear = () => {
    setCsvContent('')
    setParsedTransactions([])
    setError('')
    setDebugLogs([])
  }

  const handleLoadSample = () => {
    const sampleCSV = `"Folio No: 29447742 / 09 PAN: AQCPB2791H KYC: OK PAN: OK","(Non-Demat) - ISIN: INF109K01S39(Advisor: CAT-1-EOP-0002)","13-Nov-23"," SIP Purchase Instalment No - 1 Appln : 972518 - INA100006898 ","9999.5","146.583","68.2171","146.583"`
    setCsvContent(sampleCSV)
    setParsedTransactions([])
    setError('')
    setDebugLogs([])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CSV Parser Test</h1>
          <p className="text-gray-600">Test the CAMS CSV parser without affecting the database</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">CSV Input</h2>
            
            <div className="mb-4">
              <label htmlFor="csv-content" className="block text-sm font-semibold text-gray-700 mb-2">
                Paste CSV Content
              </label>
              <textarea
                id="csv-content"
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Paste your CAMS CSV content here..."
                className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleTestParse}
                disabled={isProcessing || !csvContent.trim()}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 disabled:text-gray-400 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isProcessing ? 'Processing...' : 'Test Parse'}
              </button>
              <button
                onClick={handleLoadSample}
                className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Load Sample
              </button>
              <button
                onClick={handleClear}
                className="flex-1 h-12 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Clear
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Parsed Output</h2>
            
            {parsedTransactions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Found {parsedTransactions.length} transaction(s)
                  </p>
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(parsedTransactions, null, 2))}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Copy JSON
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {parsedTransactions.map((transaction, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg mb-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Date:</span>
                          <span className="ml-2 text-gray-900">{transaction.date}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Amount:</span>
                          <span className="ml-2 text-gray-900">₹{transaction.amount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Scheme:</span>
                          <span className="ml-2 text-gray-900">{transaction.scheme}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Folio:</span>
                          <span className="ml-2 text-gray-900">{transaction.folio_number}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">ISIN:</span>
                          <span className="ml-2 text-gray-900">{transaction.isin || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Type:</span>
                          <span className="ml-2 text-gray-900">{transaction.type}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">NAV:</span>
                          <span className="ml-2 text-gray-900">₹{transaction.nav}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Units:</span>
                          <span className="ml-2 text-gray-900">{transaction.units}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Unit Balance:</span>
                          <span className="ml-2 text-gray-900">{transaction.unit_balance}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No parsed transactions to display</p>
                <p className="text-sm text-gray-400 mt-2">
                  Enter CSV content and click &quot;Test Parse&quot; to see results
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Instructions</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>• This page allows you to test the CSV parser without affecting the database</p>
            <p>• Paste your CAMS CSV content in the input area</p>
            <p>• Click &quot;Test Parse&quot; to see how the parser would process your data</p>
            <p>• Use &quot;Load Sample&quot; to test with the example transaction</p>
            <p>• The parsed output shows exactly what would be stored in the database</p>
            <p>• No data is actually inserted into the database from this page</p>
          </div>
        </div>

        {/* Debug Logs */}
        {debugLogs.length > 0 && (
          <div className="mt-8 bg-gray-900 rounded-lg shadow-md p-8">
            <h3 className="text-lg font-bold text-white mb-4">Debug Logs</h3>
            <div className="max-h-96 overflow-y-auto">
              <pre className="text-sm text-green-400 whitespace-pre-wrap">
                {debugLogs.join('\n')}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 