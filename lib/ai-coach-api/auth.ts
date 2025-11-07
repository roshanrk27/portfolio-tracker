/**
 * AI Coach API Authentication Middleware
 * Validates API key for all AI-Coach API endpoints
 */

export function validateAICoachRequest(headers: Headers): Response | null {
  const apiKey = headers.get('X-AI-Coach-API-Key')
  const validKey = process.env.AI_COACH_API_KEY

  if (!apiKey || apiKey !== validKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized: Invalid or missing API key',
        timestamp: new Date().toISOString()
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return null // Authorization passed
}

