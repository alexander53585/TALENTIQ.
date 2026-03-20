import Anthropic from '@anthropic-ai/sdk'

// This module MUST only be used in server-side code (API routes, Server Components)
// NEVER import this in client components

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function callClaude(
  messages: ClaudeMessage[],
  options?: {
    model?: string
    maxTokens?: number
    system?: string
  }
) {
  const response = await client.messages.create({
    model: options?.model ?? 'claude-sonnet-4-6',
    max_tokens: options?.maxTokens ?? 2048,
    system: options?.system,
    messages,
  })

  return {
    content: response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join(''),
    usage: response.usage,
  }
}
