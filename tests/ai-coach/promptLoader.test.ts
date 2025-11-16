/**
 * Tests for promptLoader.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  loadSystemPrompt,
  loadUserPromptTemplate,
  renderUserPromptSingle,
  renderUserPromptBatch,
  buildPerplexityMessages
} from '../../lib/ai-coach-api/promptLoader'
import type { FundFactsPromptContext, FundFactsPromptFund } from '../../lib/ai-coach-api/types'

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn()
}))

// Mock path module
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/'))
}))

describe('promptLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadSystemPrompt', () => {
    it('should load system prompt from file', () => {
      const mockPrompt = 'You are a financial data assistant.'
      ;(readFileSync as any).mockReturnValue(mockPrompt)

      const result = loadSystemPrompt()
      expect(result).toBe(mockPrompt)
      expect(readFileSync).toHaveBeenCalled()
    })

    it('should cache system prompt after first load', () => {
      const mockPrompt = 'You are a financial data assistant.'
      ;(readFileSync as any).mockReturnValue(mockPrompt)

      const result1 = loadSystemPrompt()
      const result2 = loadSystemPrompt()

      expect(result1).toBe(result2)
      // Should only read file once due to caching
      expect(readFileSync).toHaveBeenCalledTimes(1)
    })

    it('should throw error if file not found', () => {
      ;(readFileSync as any).mockImplementation(() => {
        throw new Error('ENOENT: no such file')
      })

      expect(() => loadSystemPrompt()).toThrow('Failed to load system prompt')
    })
  })

  describe('loadUserPromptTemplate', () => {
    it('should load single fund template', () => {
      const mockTemplate = 'Fund: {{scheme_name}}'
      ;(readFileSync as any).mockReturnValue(mockTemplate)

      const result = loadUserPromptTemplate(false)
      expect(result).toBe(mockTemplate)
    })

    it('should load batch fund template', () => {
      const mockTemplate = '{{#each funds}}{{scheme_name}}{{/each}}'
      ;(readFileSync as any).mockReturnValue(mockTemplate)

      const result = loadUserPromptTemplate(true)
      expect(result).toBe(mockTemplate)
    })
  })

  describe('renderUserPromptSingle', () => {
    it('should replace all variables with values', () => {
      const template = 'Fund: {{scheme_name}}, Code: {{fund_id}}, ISIN: {{isin}}'
      const fund: FundFactsPromptFund = {
        scheme_name: 'Test Fund',
        fund_id: '12345',
        isin: 'IN123456789',
        latest_nav: 100.5,
        current_value: 50000
      }

      const result = renderUserPromptSingle(template, fund)
      expect(result).toContain('Test Fund')
      expect(result).toContain('12345')
      expect(result).toContain('IN123456789')
    })

    it('should replace missing variables with N/A', () => {
      const template = 'Fund: {{scheme_name}}, ISIN: {{isin}}, NAV: {{latest_nav}}'
      const fund: FundFactsPromptFund = {
        scheme_name: 'Test Fund',
        fund_id: null,
        isin: null,
        latest_nav: null,
        current_value: null
      }

      const result = renderUserPromptSingle(template, fund)
      expect(result).toContain('Test Fund')
      expect(result).toContain('N/A')
    })

    it('should handle goal context variables', () => {
      const template = 'Goal: {{goal_name}}, Description: {{goal_description}}'
      const fund: FundFactsPromptFund = {
        scheme_name: 'Test Fund',
        fund_id: '12345',
        isin: null,
        latest_nav: null,
        current_value: null
      }
      const context: FundFactsPromptContext = {
        goal_name: 'Retirement',
        goal_description: 'Save for retirement',
        funds: [fund]
      }

      const result = renderUserPromptSingle(template, fund, context)
      expect(result).toContain('Retirement')
      expect(result).toContain('Save for retirement')
    })

    it('should handle missing goal context with N/A', () => {
      const template = 'Goal: {{goal_name}}'
      const fund: FundFactsPromptFund = {
        scheme_name: 'Test Fund',
        fund_id: '12345',
        isin: null,
        latest_nav: null,
        current_value: null
      }

      const result = renderUserPromptSingle(template, fund)
      expect(result).toContain('N/A')
    })

    it('should handle conditional sections', () => {
      const template = 'Goal: {{goal_name}}{{#if goal_description}} – {{goal_description}}{{/if}}'
      const fund: FundFactsPromptFund = {
        scheme_name: 'Test Fund',
        fund_id: '12345',
        isin: null,
        latest_nav: null,
        current_value: null
      }
      const context: FundFactsPromptContext = {
        goal_name: 'Retirement',
        goal_description: 'Save for retirement',
        funds: [fund]
      }

      const result = renderUserPromptSingle(template, fund, context)
      expect(result).toContain('Retirement')
      expect(result).toContain('Save for retirement')
    })

    it('should remove conditional sections when condition is false', () => {
      const template = 'Goal: {{goal_name}}{{#if goal_description}} – {{goal_description}}{{/if}}'
      const fund: FundFactsPromptFund = {
        scheme_name: 'Test Fund',
        fund_id: '12345',
        isin: null,
        latest_nav: null,
        current_value: null
      }
      const context: FundFactsPromptContext = {
        goal_name: 'Retirement',
        goal_description: null,
        funds: [fund]
      }

      const result = renderUserPromptSingle(template, fund, context)
      expect(result).toContain('Retirement')
      expect(result).not.toContain('–')
    })
  })

  describe('renderUserPromptBatch', () => {
    it('should render loop for multiple funds', () => {
      const template = '{{#each funds}}{{index}}. {{scheme_name}} ({{fund_id}})\n{{/each}}'
      const funds: FundFactsPromptFund[] = [
        {
          scheme_name: 'Fund 1',
          fund_id: '111',
          isin: null,
          latest_nav: null,
          current_value: null
        },
        {
          scheme_name: 'Fund 2',
          fund_id: '222',
          isin: null,
          latest_nav: null,
          current_value: null
        }
      ]

      const result = renderUserPromptBatch(template, funds)
      expect(result).toContain('1. Fund 1 (111)')
      expect(result).toContain('2. Fund 2 (222)')
    })

    it('should replace variables with N/A for missing values', () => {
      const template = '{{#each funds}}{{scheme_name}} | ISIN: {{isin}}\n{{/each}}'
      const funds: FundFactsPromptFund[] = [
        {
          scheme_name: 'Fund 1',
          fund_id: null,
          isin: null,
          latest_nav: null,
          current_value: null
        }
      ]

      const result = renderUserPromptBatch(template, funds)
      expect(result).toContain('Fund 1')
      expect(result).toContain('N/A')
    })

    it('should handle goal context in batch template', () => {
      const template = 'Goal: {{goal_name}}\n{{#each funds}}{{scheme_name}}\n{{/each}}'
      const funds: FundFactsPromptFund[] = [
        {
          scheme_name: 'Fund 1',
          fund_id: '111',
          isin: null,
          latest_nav: null,
          current_value: null
        }
      ]
      const context: FundFactsPromptContext = {
        goal_name: 'Retirement',
        goal_description: 'Save for retirement',
        funds
      }

      const result = renderUserPromptBatch(template, funds, context)
      expect(result).toContain('Retirement')
      expect(result).toContain('Fund 1')
    })
  })

  describe('buildPerplexityMessages', () => {
    it('should build system and user messages for single fund', () => {
      const mockSystemPrompt = 'You are a financial assistant.'
      const mockUserTemplate = 'Fund: {{scheme_name}}'
      ;(readFileSync as any).mockImplementation((path: string) => {
        if (path.includes('system-prompt.md')) return mockSystemPrompt
        if (path.includes('user-prompt-single.md')) return mockUserTemplate
        return ''
      })

      const fund: FundFactsPromptFund = {
        scheme_name: 'Test Fund',
        fund_id: '12345',
        isin: null,
        latest_nav: null,
        current_value: null
      }
      const context: FundFactsPromptContext = {
        funds: [fund]
      }

      const { system, user } = buildPerplexityMessages(context)
      expect(system).toBe(mockSystemPrompt)
      expect(user).toContain('Test Fund')
    })

    it('should build messages for batch funds', () => {
      const mockSystemPrompt = 'You are a financial assistant.'
      const mockUserTemplate = '{{#each funds}}{{scheme_name}}\n{{/each}}'
      ;(readFileSync as any).mockImplementation((path: string) => {
        if (path.includes('system-prompt.md')) return mockSystemPrompt
        if (path.includes('user-prompt-batch.md')) return mockUserTemplate
        return ''
      })

      const funds: FundFactsPromptFund[] = [
        {
          scheme_name: 'Fund 1',
          fund_id: '111',
          isin: null,
          latest_nav: null,
          current_value: null
        },
        {
          scheme_name: 'Fund 2',
          fund_id: '222',
          isin: null,
          latest_nav: null,
          current_value: null
        }
      ]
      const context: FundFactsPromptContext = {
        funds
      }

      const { system, user } = buildPerplexityMessages(context)
      expect(system).toBe(mockSystemPrompt)
      expect(user).toContain('Fund 1')
      expect(user).toContain('Fund 2')
    })

    it('should throw error if no funds provided', () => {
      const context: FundFactsPromptContext = {
        funds: []
      }

      expect(() => buildPerplexityMessages(context)).toThrow('No funds provided')
    })
  })
})

