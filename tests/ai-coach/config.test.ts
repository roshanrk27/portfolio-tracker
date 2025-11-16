import { afterEach, describe, expect, it, vi } from 'vitest'

describe('aiCoachConfig defaults', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  it('provides safe defaults when environment variables are absent', async () => {
    process.env = { ...originalEnv }
    delete process.env.FUND_FACTS_USE_LLM
    delete process.env.FUND_FACTS_MIN_CONFIDENCE
    delete process.env.FUND_FACTS_TTL_DAYS

    vi.resetModules()
    const { aiCoachConfig } = await import('../../lib/ai-coach-api/config')

    expect(aiCoachConfig.perplexityApiKey).toBeUndefined()
    expect(aiCoachConfig.fundFacts.useLLM).toBe(false)
    expect(aiCoachConfig.fundFacts.minConfidence).toBe('medium')
    expect(aiCoachConfig.fundFacts.ttlDays).toBe(30)
  })

  it('parses environment variables when provided', async () => {
    process.env = {
      ...originalEnv,
      FUND_FACTS_USE_LLM: 'true',
      FUND_FACTS_MIN_CONFIDENCE: 'high',
      FUND_FACTS_TTL_DAYS: '45',
      PERPLEXITY_API_KEY: 'test-key'
    }

    vi.resetModules()
    const { aiCoachConfig } = await import('../../lib/ai-coach-api/config')

    expect(aiCoachConfig.perplexityApiKey).toBe('test-key')
    expect(aiCoachConfig.fundFacts.useLLM).toBe(true)
    expect(aiCoachConfig.fundFacts.minConfidence).toBe('high')
    expect(aiCoachConfig.fundFacts.ttlDays).toBe(45)
  })
})

