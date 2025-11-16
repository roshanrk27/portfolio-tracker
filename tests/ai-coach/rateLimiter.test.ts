import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkDailyBudget, recordPerplexityCall, validateBatchSize, createRateLimitError } from '../../lib/ai-coach-api/rateLimiter'
import type { SupabaseLike } from '../../lib/ai-coach-api/fundFactsCache'

describe('rateLimiter', () => {
  const mockSupabase: SupabaseLike = {
    from: vi.fn()
  } as unknown as SupabaseLike

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkDailyBudget', () => {
    it('should allow request when under budget', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { call_count: 50 },
          error: null
        })
      }

      vi.mocked(mockSupabase.from).mockReturnValue(mockBuilder as unknown as any)

      const result = await checkDailyBudget(mockSupabase)

      expect(result.allowed).toBe(true)
      expect(result.callsToday).toBe(50)
      expect(result.limit).toBe(100) // default
    })

    it('should reject request when budget exceeded', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { call_count: 100 },
          error: null
        })
      }

      vi.mocked(mockSupabase.from).mockReturnValue(mockBuilder as unknown as any)

      const result = await checkDailyBudget(mockSupabase)

      expect(result.allowed).toBe(false)
      expect(result.callsToday).toBe(100)
      expect(result.limit).toBe(100)
      expect(result.reason).toContain('Daily budget exceeded')
    })

    it('should allow request when no record exists (first call of day)', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }

      vi.mocked(mockSupabase.from).mockReturnValue(mockBuilder as unknown as any)

      const result = await checkDailyBudget(mockSupabase)

      expect(result.allowed).toBe(true)
      expect(result.callsToday).toBe(0)
    })

    it('should fail open on database error (graceful degradation)', async () => {
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      }

      vi.mocked(mockSupabase.from).mockReturnValue(mockBuilder as unknown as any)

      const result = await checkDailyBudget(mockSupabase)

      // Should fail open (allow request) to avoid blocking legitimate requests
      expect(result.allowed).toBe(true)
      expect(result.callsToday).toBe(0)
    })
  })

  describe('recordPerplexityCall', () => {
    it('should increment counter for new day', async () => {
      const selectBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null, // No existing record
          error: null
        })
      }

      const upsertBuilder = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      }

      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce(selectBuilder as unknown as any)
        .mockReturnValueOnce(upsertBuilder as unknown as any)

      await recordPerplexityCall(mockSupabase)

      expect(upsertBuilder.upsert).toHaveBeenCalledWith({
        date: expect.any(String),
        call_count: 1,
        updated_at: expect.any(String)
      })
    })

    it('should increment existing counter', async () => {
      const selectBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { call_count: 50 },
          error: null
        })
      }

      const upsertBuilder = {
        upsert: vi.fn().mockResolvedValue({ error: null })
      }

      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce(selectBuilder as unknown as any)
        .mockReturnValueOnce(upsertBuilder as unknown as any)

      await recordPerplexityCall(mockSupabase)

      expect(upsertBuilder.upsert).toHaveBeenCalledWith({
        date: expect.any(String),
        call_count: 51,
        updated_at: expect.any(String)
      })
    })

    it('should not throw on database error', async () => {
      const selectBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { call_count: 50 },
          error: null
        })
      }

      const upsertBuilder = {
        upsert: vi.fn().mockResolvedValue({
          error: { message: 'Database error' }
        })
      }

      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce(selectBuilder as unknown as any)
        .mockReturnValueOnce(upsertBuilder as unknown as any)

      // Should not throw
      await expect(recordPerplexityCall(mockSupabase)).resolves.not.toThrow()
    })
  })

  describe('validateBatchSize', () => {
    it('should allow batch within limit', () => {
      const result = validateBatchSize(['120503', '118834', '120504'])
      expect(result.valid).toBe(true)
    })

    it('should reject batch exceeding limit', () => {
      const fundIds = Array.from({ length: 15 }, (_, i) => String(120500 + i))
      const result = validateBatchSize(fundIds)
      
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('exceeds maximum')
      expect(result.reason).toContain('15')
      expect(result.reason).toContain('10')
    })

    it('should allow empty batch', () => {
      const result = validateBatchSize([])
      expect(result.valid).toBe(true)
    })
  })

  describe('createRateLimitError', () => {
    it('should create error with retry_after', () => {
      const check = {
        allowed: false,
        callsToday: 100,
        limit: 100,
        reason: 'Daily budget exceeded'
      }

      const error = createRateLimitError(check)

      expect(error.type).toBe('budget_exceeded')
      expect(error.calls_today).toBe(100)
      expect(error.limit).toBe(100)
      expect(error.retry_after).toBeGreaterThan(0)
      expect(error.retry_after).toBeLessThanOrEqual(86400) // Max 24 hours
    })
  })
})

