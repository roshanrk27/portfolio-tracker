import { describe, it, expect } from 'vitest'
import { validateGuardrails, sanitizeLLMData, stripRecommendationLanguage } from '../../lib/ai-coach-api/guardrails'
import type { FundFactsLLM } from '../../lib/ai-coach-api/types'

describe('guardrails', () => {
  const baseLLMData: FundFactsLLM = {
    fund_ident: {
      query_name: 'Test Fund',
      amfi_code: '120503',
      isin: 'INF123456789',
      scheme_name_official: 'Test Fund Official Name',
      plan: 'Direct',
      option: 'Growth'
    },
    facts: {
      category: 'Equity',
      benchmark: 'Nifty 50',
      expense_ratio_pct: 0.5,
      aum_cr: 1000
    },
    performance: {
      as_of: '2025-11-08',
      cagr_1y: 0.15,
      cagr_3y: 0.12,
      cagr_5y: 0.10,
      ret_ytd: 0.08,
      ret_1m: 0.01,
      ret_3m: 0.03,
      ret_6m: 0.06
    },
    risk_metrics: {
      period: '3Y',
      as_of: '2025-11-08',
      alpha: 0.05,
      beta: 1.2,
      sharpe_ratio: 1.5,
      sortino_ratio: 1.8,
      stddev_pct: 0.15,
      r_squared: 0.95,
      information_ratio: 0.8,
      source: 'AMFI factsheet'
    },
    sources: [
      {
        field: 'expense_ratio',
        url: 'https://example.com/factsheet',
        as_of: '2025-11-01'
      }
    ],
    confidence: 'high',
    notes: null
  }

  describe('validateGuardrails', () => {
    it('should pass for valid high confidence data', () => {
      const result = validateGuardrails(baseLLMData)
      expect(result.passed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should pass for valid medium confidence data', () => {
      const data = { ...baseLLMData, confidence: 'medium' as const }
      const result = validateGuardrails(data)
      expect(result.passed).toBe(true)
    })

    it('should fail for low confidence', () => {
      const data = { ...baseLLMData, confidence: 'low' as const }
      const result = validateGuardrails(data)
      expect(result.passed).toBe(false)
      expect(result.reason).toBe('confidence is low')
    })

    it('should fail when both scheme_name and amfi_code are missing', () => {
      const data: FundFactsLLM = {
        ...baseLLMData,
        fund_ident: {
          ...baseLLMData.fund_ident,
          scheme_name_official: null,
          query_name: '',
          amfi_code: null
        }
      }
      const result = validateGuardrails(data)
      expect(result.passed).toBe(false)
      expect(result.reason).toBe('both scheme_name and amfi_code are missing')
    })

    it('should pass when scheme_name is present but amfi_code is missing', () => {
      const data: FundFactsLLM = {
        ...baseLLMData,
        fund_ident: {
          ...baseLLMData.fund_ident,
          amfi_code: null
        }
      }
      const result = validateGuardrails(data)
      expect(result.passed).toBe(true)
    })

    it('should pass when amfi_code is present but scheme_name is missing', () => {
      const data: FundFactsLLM = {
        ...baseLLMData,
        fund_ident: {
          ...baseLLMData.fund_ident,
          scheme_name_official: null,
          query_name: ''
        }
      }
      const result = validateGuardrails(data)
      expect(result.passed).toBe(true)
    })

    it('should fail when sources is empty', () => {
      const data: FundFactsLLM = {
        ...baseLLMData,
        sources: []
      }
      const result = validateGuardrails(data)
      expect(result.passed).toBe(false)
      expect(result.reason).toBe('sources is empty')
    })

    it('should fail when sources is missing', () => {
      const data = { ...baseLLMData }
      delete (data as { sources?: unknown }).sources
      const result = validateGuardrails(data as FundFactsLLM)
      expect(result.passed).toBe(false)
      expect(result.reason).toBe('sources is empty')
    })

    it('should fail when scheme_name and amfi_code are empty strings', () => {
      const data: FundFactsLLM = {
        ...baseLLMData,
        fund_ident: {
          ...baseLLMData.fund_ident,
          scheme_name_official: '',
          query_name: '',
          amfi_code: ''
        }
      }
      const result = validateGuardrails(data)
      expect(result.passed).toBe(false)
      expect(result.reason).toBe('both scheme_name and amfi_code are missing')
    })
  })

  describe('stripRecommendationLanguage', () => {
    it('should return null for text with recommendation language', () => {
      expect(stripRecommendationLanguage('You should invest in this fund')).toBeNull()
      expect(stripRecommendationLanguage('We recommend this scheme')).toBeNull()
      expect(stripRecommendationLanguage('You must buy this fund')).toBeNull()
      expect(stripRecommendationLanguage('We suggest avoiding this fund')).toBeNull()
    })

    it('should return text unchanged if no recommendation language', () => {
      expect(stripRecommendationLanguage('This fund has an expense ratio of 0.5%')).toBe('This fund has an expense ratio of 0.5%')
      expect(stripRecommendationLanguage('The fund returned 15% CAGR over 3 years')).toBe('The fund returned 15% CAGR over 3 years')
    })

    it('should handle null and undefined', () => {
      expect(stripRecommendationLanguage(null)).toBeNull()
      expect(stripRecommendationLanguage(undefined)).toBeUndefined()
    })
  })

  describe('sanitizeLLMData', () => {
    it('should sanitize notes field with recommendation language', () => {
      const data: FundFactsLLM = {
        ...baseLLMData,
        notes: 'You should invest in this fund for best returns'
      }
      const sanitized = sanitizeLLMData(data)
      expect(sanitized.notes).toBeNull()
    })

    it('should preserve notes field without recommendation language', () => {
      const data: FundFactsLLM = {
        ...baseLLMData,
        notes: 'This fund has shown consistent performance over the years'
      }
      const sanitized = sanitizeLLMData(data)
      expect(sanitized.notes).toBe('This fund has shown consistent performance over the years')
    })

    it('should preserve all other fields', () => {
      const sanitized = sanitizeLLMData(baseLLMData)
      expect(sanitized.fund_ident).toEqual(baseLLMData.fund_ident)
      expect(sanitized.facts).toEqual(baseLLMData.facts)
      expect(sanitized.performance).toEqual(baseLLMData.performance)
      expect(sanitized.risk_metrics).toEqual(baseLLMData.risk_metrics)
      expect(sanitized.sources).toEqual(baseLLMData.sources)
      expect(sanitized.confidence).toBe(baseLLMData.confidence)
    })
  })
})

