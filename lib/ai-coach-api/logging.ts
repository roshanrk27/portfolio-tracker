/**
 * Logging utilities for AI Coach API
 * Provides structured logging with redaction and request ID tracking
 */

import { createHash } from 'crypto'

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Redact API keys from strings
 */
export function redactApiKey(text: string): string {
  if (!text) return text
  
  // Redact common API key patterns
  // Matches: "key": "sk-...", "api_key": "...", "PERPLEXITY_API_KEY": "..."
  return text
    .replace(/(["']?(?:api[_-]?key|api[_-]?token|authorization)["']?\s*[:=]\s*["']?)([^"'\s]{10,})(["']?)/gi, '$1***REDACTED***$3')
    .replace(/(sk-)[a-zA-Z0-9]{20,}/g, '$1***REDACTED***')
    .replace(/(Bearer\s+)[a-zA-Z0-9\-._~+/]+/gi, '$1***REDACTED***')
}

/**
 * Hash a prompt for debugging without exposing full content
 */
export function hashPrompt(prompt: string): string {
  if (!prompt) return ''
  const hash = createHash('sha256')
  hash.update(prompt)
  return hash.digest('hex').substring(0, 16) // First 16 chars for brevity
}

/**
 * Redact sensitive data from an object
 */
export function redactSensitiveData(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? redactApiKey(obj) : obj
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData)
  }

  const redacted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    // Redact common sensitive fields
    if (
      lowerKey.includes('key') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      lowerKey.includes('authorization')
    ) {
      redacted[key] = '***REDACTED***'
    } else if (typeof value === 'string') {
      redacted[key] = redactApiKey(value)
    } else {
      redacted[key] = redactSensitiveData(value)
    }
  }

  return redacted
}

/**
 * Structured log entry for fund facts requests
 */
export interface FundFactsLogEntry {
  request_id: string
  fund_id: string
  cache_status: 'hit' | 'miss' | 'disabled' | 'error'
  confidence?: 'high' | 'medium' | 'low' | null
  latency_ms: number
  adapter_status: 'success' | 'error' | 'skipped' | 'low_confidence' | 'empty_response'
  prompt_hash?: string
  error_message?: string
}

/**
 * Log fund facts request with structured data
 */
export function logFundFactsRequest(entry: FundFactsLogEntry): void {
  const sanitized = redactSensitiveData(entry)
  console.log('[fund-facts]', JSON.stringify(sanitized))
}

/**
 * Create a response with X-Request-ID header
 */
export function addRequestIdHeader(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers)
  headers.set('X-Request-ID', requestId)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

