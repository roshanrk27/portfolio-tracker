/**
 * Prompt loader and template renderer for Perplexity API
 * Loads system and user prompts from markdown files and renders them with fund data
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import type { FundFactsPromptContext, FundFactsPromptFund } from './types'

const PROMPTS_DIR = join(process.cwd(), 'lib', 'ai-coach-api', 'prompts')
const SYSTEM_PROMPT_FILE = 'system-prompt.md'
const USER_PROMPT_SINGLE_FILE = 'user-prompt-single.md'
const USER_PROMPT_BATCH_FILE = 'user-prompt-batch.md'

// Cache system prompt (never changes)
let cachedSystemPrompt: string | null = null

/**
 * Load system prompt from file (cached after first load)
 */
export function loadSystemPrompt(): string {
  if (cachedSystemPrompt !== null) {
    return cachedSystemPrompt
  }

  try {
    const filePath = join(PROMPTS_DIR, SYSTEM_PROMPT_FILE)
    cachedSystemPrompt = readFileSync(filePath, 'utf-8').trim()
    return cachedSystemPrompt
  } catch (error) {
    throw new Error(
      `Failed to load system prompt from ${join(PROMPTS_DIR, SYSTEM_PROMPT_FILE)}: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Load user prompt template (single or batch)
 */
export function loadUserPromptTemplate(isBatch: boolean): string {
  const fileName = isBatch ? USER_PROMPT_BATCH_FILE : USER_PROMPT_SINGLE_FILE
  try {
    const filePath = join(PROMPTS_DIR, fileName)
    return readFileSync(filePath, 'utf-8').trim()
  } catch (error) {
    throw new Error(
      `Failed to load user prompt template from ${join(PROMPTS_DIR, fileName)}: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Replace a template variable with its value or "N/A"
 */
function replaceVariable(template: string, varName: string, value: string | number | null | undefined): string {
  const stringValue = value === null || value === undefined ? 'N/A' : String(value)
  const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g')
  return template.replace(regex, stringValue)
}

/**
 * Render single fund user prompt
 */
export function renderUserPromptSingle(
  template: string,
  fund: FundFactsPromptFund,
  context?: FundFactsPromptContext
): string {
  let rendered = template

  // Replace fund variables (support both old and new variable names)
  rendered = replaceVariable(rendered, 'scheme_name', fund.scheme_name || null)
  rendered = replaceVariable(rendered, 'fund_name', fund.scheme_name || null) // New variable name
  rendered = replaceVariable(rendered, 'fund_id', fund.fund_id || null)
  rendered = replaceVariable(rendered, 'amfi_code', fund.fund_id || null) // Alias for fund_id
  rendered = replaceVariable(rendered, 'fund_amfi_code', fund.fund_id || null) // New variable name
  rendered = replaceVariable(rendered, 'isin', fund.isin || null)
  rendered = replaceVariable(rendered, 'fund_isin', fund.isin || null) // New variable name
  rendered = replaceVariable(rendered, 'latest_nav', fund.latest_nav || null)
  rendered = replaceVariable(rendered, 'current_value', fund.current_value || null)

  // Replace goal context variables
  const goalName = context?.goal_name || 'N/A'
  const goalDescription = context?.goal_description || null
  rendered = replaceVariable(rendered, 'goal_name', goalName)
  rendered = replaceVariable(rendered, 'goal_description', goalDescription)

  // Handle conditional sections ({{#if variable}}...{{/if}})
  rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
    // Check if variable has a non-N/A value
    const varValue = varName === 'goal_description' ? goalDescription : null
    if (varValue && varValue !== 'N/A' && varValue !== null && varValue !== undefined) {
      return content
    }
    return ''
  })

  return rendered.trim()
}

/**
 * Render batch funds user prompt with loop syntax
 */
export function renderUserPromptBatch(
  template: string,
  funds: FundFactsPromptFund[],
  context?: FundFactsPromptContext
): string {
  let rendered = template

  // Replace goal context variables first
  const goalName = context?.goal_name || 'N/A'
  const goalDescription = context?.goal_description || null
  rendered = replaceVariable(rendered, 'goal_name', goalName)
  rendered = replaceVariable(rendered, 'goal_description', goalDescription)

  // Handle {{#each funds}}...{{/each}} or {{#funds}}...{{/funds}} loop
  rendered = rendered.replace(/\{\{#(?:each\s+)?funds\}\}([\s\S]*?)\{\{\/funds\}\}/g, (match, loopContent) => {
    const fundLines: string[] = []
    
    funds.forEach((fund, index) => {
      let fundLine = loopContent
      
      // Replace fund variables in loop (support both old and new variable names)
      fundLine = replaceVariable(fundLine, 'scheme_name', fund.scheme_name || null)
      fundLine = replaceVariable(fundLine, 'name', fund.scheme_name || null) // New variable name in batch
      fundLine = replaceVariable(fundLine, 'fund_name', fund.scheme_name || null)
      fundLine = replaceVariable(fundLine, 'fund_id', fund.fund_id || null)
      fundLine = replaceVariable(fundLine, 'amfi_code', fund.fund_id || null) // Alias (used in batch template)
      fundLine = replaceVariable(fundLine, 'fund_amfi_code', fund.fund_id || null)
      fundLine = replaceVariable(fundLine, 'isin', fund.isin || null) // Used in batch template
      fundLine = replaceVariable(fundLine, 'fund_isin', fund.isin || null)
      fundLine = replaceVariable(fundLine, 'latest_nav', fund.latest_nav || null)
      fundLine = replaceVariable(fundLine, 'current_value', fund.current_value || null)
      
      // Replace {{index}} with 1-based index
      fundLine = fundLine.replace(/\{\{index\}\}/g, String(index + 1))
      
      fundLines.push(fundLine)
    })
    
    return fundLines.join('')
  })

  // Handle any remaining conditional sections
  rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
    const varValue = varName === 'goal_description' ? goalDescription : null
    if (varValue && varValue !== 'N/A' && varValue !== null && varValue !== undefined) {
      return content
    }
    return ''
  })

  return rendered.trim()
}

/**
 * Build complete prompt messages for Perplexity API
 * Returns system and user messages
 */
export function buildPerplexityMessages(context: FundFactsPromptContext): {
  system: string
  user: string
} {
  const systemPrompt = loadSystemPrompt()
  const funds = context.funds
  const isBatch = funds.length > 1

  if (funds.length === 0) {
    throw new Error('No funds provided for prompt generation')
  }

  const userTemplate = loadUserPromptTemplate(isBatch)
  const userPrompt = isBatch
    ? renderUserPromptBatch(userTemplate, funds, context)
    : renderUserPromptSingle(userTemplate, funds[0], context)

  return {
    system: systemPrompt,
    user: userPrompt
  }
}

