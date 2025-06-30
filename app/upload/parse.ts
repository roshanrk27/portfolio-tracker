'use server'

import { createClient } from '@supabase/supabase-js'

// Create server-side Supabase client with service role key
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function parseUploadedFile(uploadId: string) {
  console.log('Starting parse for upload ID:', uploadId)
  
  try {
    // Get upload record
    const { data: upload, error: uploadError } = await supabaseServer
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .single()

    if (uploadError) {
      console.error('Upload fetch error:', uploadError)
      throw new Error(`Upload not found: ${uploadError.message}`)
    }

    if (!upload) {
      throw new Error('Upload record not found')
    }

    console.log('Found upload:', upload.storage_path)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseServer.storage
      .from('uploads')
      .download(upload.storage_path)

    if (downloadError) {
      console.error('Download error:', downloadError)
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    if (!fileData) {
      throw new Error('No file data received')
    }

    console.log('File downloaded, size:', fileData.size)

    // Convert file to text
    const fileText = await fileData.text()
    console.log('File text length:', fileText.length)
    console.log('First 200 chars:', fileText.substring(0, 200))
    
    // Parse CSV content
    const transactions = parseCAMSCSV(fileText)
    console.log('Parsed transactions:', transactions.length)

    // Store transactions in database
    if (transactions.length > 0) {
      const transactionsToInsert = transactions.map(t => ({
        user_id: upload.user_id,
        date: t.date,
        scheme_name: t.scheme,
        folio: t.folio_number,
        isin: t.isin,
        amount: t.amount,
        transaction_type: t.type,
        price: t.nav,
        units: t.units,
        unit_balance: t.unit_balance
      }))

      const { error: insertError } = await supabaseServer
        .from('transactions')
        .insert(transactionsToInsert)

      if (insertError) {
        console.error('Transaction insert error:', insertError)
        throw new Error(`Failed to store transactions: ${insertError.message}`)
      }

      console.log('Stored', transactions.length, 'transactions in database')
    }

    // Update upload status
    const { error: updateError } = await supabaseServer
      .from('uploads')
      .update({ status: 'parsed' })
      .eq('id', uploadId)

    if (updateError) {
      console.error('Status update error:', updateError)
    }

    return { success: true, transactions, count: transactions.length }

  } catch (error: any) {
    console.error('Parse error:', error)
    
    // Update upload status to failed
    try {
      await supabaseServer
        .from('uploads')
        .update({ status: 'failed' })
        .eq('id', uploadId)
    } catch (updateError) {
      console.error('Failed to update upload status:', updateError)
    }

    return { success: false, error: error.message }
  }
}

function parseCAMSCSV(csvContent: string) {
  const lines = csvContent.split('\n')
  const transactions: any[] = []

  console.log('Total lines in CSV:', lines.length)

  // Skip header lines and find transaction data
  let inTransactionSection = false
  let headers: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Look for transaction table header
    if (line.includes('Transaction Date') || line.includes('Scheme Name') || line.includes('Amount')) {
      inTransactionSection = true
      headers = line.split(',').map(h => h.trim().replace(/"/g, ''))
      console.log('Found headers:', headers)
      continue
    }

    if (inTransactionSection && line && !line.includes('Total') && !line.includes('Grand Total')) {
      const values = parseCSVLine(line)
    //  console.log('Values:', values)
      
      if (values.length >= 6) {
        const schemeInfo = extractISINFromScheme(values[1]?.trim() || '')
        //console.log('Scheme Info:', schemeInfo)
        const schemeName = extractSchemeName(values[1]?.trim() || '')
        const folioNumber = extractFolioNumber(values[0]?.trim() || '')
        //console.log('Folio Number:', folioNumber)
        
        const transaction = {
          date: values[2]?.trim() || '',
          scheme: schemeName,
          folio_number: folioNumber,
          isin: schemeInfo.isin,
          amount: parseFloat(values[4]?.replace(/[^\d.-]/g, '') || '0'),
          type: values[3]?.trim() || '',
          nav: parseFloat(values[6]?.replace(/[^\d.-]/g, '') || '0'),
          units: parseFloat(values[5]?.replace(/[^\d.-]/g, '') || '0'),
          unit_balance: parseFloat(values[7]?.replace(/[^\d.-]/g, '') || '0')
        }
        console.log('Transaction:', transaction)

        // Only add valid transactions
        if (transaction.date && transaction.scheme && transaction.amount !== 0) {
          transactions.push(transaction)
        }
      }
    }
  }

  console.log('Final transaction count:', transactions.length)
  return transactions
}

function extractFolioNumber(folioText: string): string {
   // Match pattern like "Folio No: 910113429126 / 0"
   const folio = folioText.match(/Folio\s*No:\s*([\d]+)\s*\/\s*(\d+)/)
   //console.log(`Folio extraction: "${folioText}" -> "${folio}"`)
   if (folio) {
     return `${folio[1]}/${folio[2]}`
   }
 
   // Fallback: extract plain number
   const fallback = folioText.match(/\d{6,}/)
  // console.log(`Fallback extraction: "${folioText}" -> "${fallback}"`)
   return fallback ? fallback[0] : ''
  
}

function extractISINFromScheme(schemeText: string) {
// Match ISIN: 2 uppercase letters followed by 9 alphanumeric characters
  // (drop \b word boundaries to allow trailing characters like parentheses)
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

function parseCSVLine(line: string): string[] {
 // console.log('Parsing CSV line:', line)
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