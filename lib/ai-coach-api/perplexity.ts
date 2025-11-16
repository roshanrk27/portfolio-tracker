import { aiCoachConfig } from './config'
import { normalizeFundMappings } from './helpers'
import { buildPerplexityMessages } from './promptLoader'
import { FundFactsLLMSchema } from './schema'
import type { FundFactsLLM, FundFactsPromptContext } from './types'

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'
const REQUEST_TIMEOUT_MS = 20_000
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

/**
 * Strip markdown code blocks from JSON string
 * Handles cases like: ```json\n[...]\n``` or ```\n[...]\n```
 */
function stripMarkdownCodeBlocks(content: string): string {
  if (!content) return content
  
  let cleaned = content.trim()
  
  // Remove opening markdown code block (```json or ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '')
  
  // Remove closing markdown code block (```)
  cleaned = cleaned.replace(/\n?```\s*$/i, '')
  
  return cleaned.trim()
}

interface PerplexityResponse {
  status: number
  body: unknown
  payload: FundFactsLLM[]
}

interface PerplexityAPIResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

async function callWithTimeout(request: Request): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(request, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchPerplexityFundFacts(context: FundFactsPromptContext): Promise<PerplexityResponse> {
  if (!aiCoachConfig.perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set')
  }

  const funds = normalizeFundMappings(context.funds)
  if (funds.length === 0) {
    throw new Error('No funds provided for Perplexity request')
  }

  // Build prompts from template files
  const { system, user } = buildPerplexityMessages({ ...context, funds })
  const body = JSON.stringify({
    model: 'sonar-pro',
    temperature: 0,
    max_output_tokens: 2048,
    messages: [
      {
        role: 'system',
        content: system
      },
      {
        role: 'user',
        content: user
      }
    ]
  })

  let lastError: unknown = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    let response: Response
    try {
      const request = new Request(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiCoachConfig.perplexityApiKey}`
        },
        body
      })

      response = await callWithTimeout(request)
    } catch (error) {
      lastError = error
      if (attempt === 3) {
        throw error instanceof Error ? error : new Error('Unknown Perplexity error')
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
      continue
    }

    if (!response.ok) {
      if (RETRYABLE_STATUS.has(response.status) && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500))
        continue
      }
      const text = await response.text().catch(() => '')
      throw new Error(`Perplexity request failed (${response.status}): ${text}`)
    }

    const json = (await response.json()) as PerplexityAPIResponse
    const rawContent = json.choices?.[0]?.message?.content
    if (typeof rawContent !== 'string') {
      throw new Error('Perplexity response missing textual content')
    }

    // Strip markdown code blocks if present (Perplexity sometimes wraps JSON in ```json ... ```)
    const cleanedContent = stripMarkdownCodeBlocks(rawContent)

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(cleanedContent)
    } catch (parseError) {
      // Log the raw content for debugging
      console.error('[perplexity] Failed to parse JSON. Raw content:', rawContent.substring(0, 500))
      throw new Error(`Failed to parse Perplexity JSON content: ${(parseError as Error).message}`)
    }

    // Handle both single object and array responses
    // Single fund prompts return an object, batch prompts return an array
    let validated: FundFactsLLM[]
    if (Array.isArray(parsedBody)) {
      // Batch response - validate as array
      validated = parsedBody.map(item => FundFactsLLMSchema.parse(item))
    } else {
      // Single fund response - validate as single object and wrap in array
      validated = [FundFactsLLMSchema.parse(parsedBody)]
    }

    return {
      status: response.status,
      body: parsedBody,
      payload: validated
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }
  throw new Error('Perplexity request failed')
}

