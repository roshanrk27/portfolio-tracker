/* eslint-disable no-console */
import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { createInterface } from 'readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const PROMPTS_FILE = 'scripts/perplexity-prompts.json'

async function promptPrompts() {
  const rl = createInterface({ input, output })
  const systemPrompt = await rl.question('System prompt (leave empty for none):\n> ')
  const userPrompt = await rl.question('\nUser prompt:\n> ')
  await rl.close()
  return { systemPrompt: systemPrompt.trim(), userPrompt: userPrompt.trim() }
}

async function callPerplexity(systemPrompt: string | undefined, userPrompt: string) {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set')
  }

  if (!userPrompt) {
    throw new Error('User prompt is required')
  }

  const messages = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: userPrompt })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        temperature: 0.2,
        max_output_tokens: 2048,
        messages
      }),
      signal: controller.signal
    })

    const text = await response.text()
    if (!response.ok) {
      throw new Error(`Perplexity error ${response.status}: ${text}`)
    }

    console.log('\n=== Raw response ===')
    console.log(text)

    try {
      const parsed = JSON.parse(text)
      const content = parsed?.choices?.[0]?.message?.content
      if (content) {
        console.log('\n=== choices[0].message.content ===')
        console.log(content)
        try {
          const contentJson = JSON.parse(content)
          console.log('\n=== Parsed content JSON ===')
          console.dir(contentJson, { depth: null })
        } catch {
          // content was not JSON, ignore
        }
      }
    } catch {
      // raw body was not JSON
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  try {
    let systemPrompt: string | undefined
    let userPrompt: string | undefined

    try {
      await access(PROMPTS_FILE, constants.R_OK)
      const file = await readFile(PROMPTS_FILE, 'utf-8')
      const parsed = JSON.parse(file) as { system?: string; user: string }
      systemPrompt = parsed.system?.trim() || undefined
      userPrompt = parsed.user?.trim()
      console.log(`Loaded prompts from ${PROMPTS_FILE}`)
    } catch {
      const answers = await promptPrompts()
      systemPrompt = answers.systemPrompt || undefined
      userPrompt = answers.userPrompt
    }

    if (!userPrompt) {
      throw new Error('User prompt is required')
    }

    await callPerplexity(systemPrompt, userPrompt)
  } catch (error) {
    console.error('\nPerplexity test failed:', error)
    process.exitCode = 1
  }
}

void main()

