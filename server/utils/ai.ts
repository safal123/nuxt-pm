export type AiMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const readText = async (response: Response) => {
  const text = await response.text()
  if (!response.ok) {
    throw createError({
      statusCode: response.status === 429 ? 429 : 502,
      message:
        response.status === 429
          ? 'The AI service is busy. Try again in a moment.'
          : 'The AI service could not answer right now.',
    })
  }
  return text
}

const isCreditError = (text: string) =>
  /enough credits|insufficient balance|payment required/i.test(text)

const completeOpenAiCompat = async (
  url: string,
  apiKey: string,
  model: string,
  messages: AiMessage[],
  temperature: number,
) => {
  const text = await readText(
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, temperature, messages }),
    }),
  )
  const payload = JSON.parse(text) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return payload.choices?.[0]?.message?.content?.trim() || null
}

const completeWithGemini = async (
  apiKey: string,
  messages: AiMessage[],
  temperature: number,
) => {
  const system = messages.find((message) => message.role === 'system')?.content
  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }))
  const text = await readText(
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: { temperature },
        }),
      },
    ),
  )
  const payload = JSON.parse(text) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
}

const completeWithPollinations = async (messages: AiMessage[]) => {
  const prompt = messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join('\n\n')
  const text = await readText(
    await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
      headers: { Accept: 'text/plain' },
    }),
  )
  return text.trim() || null
}

/**
 * Tries each configured provider in order, then the keyless Pollinations API.
 * Returns null when nobody produced usable text so callers can fall back.
 */
export const completeChat = async (
  messages: AiMessage[],
  options: { temperature?: number } = {},
) => {
  const config = useRuntimeConfig()
  const temperature = options.temperature ?? 0.3
  const deepseekKey = String(config.deepseekApiKey || '').trim()
  const groqKey = String(config.groqApiKey || '').trim()
  const geminiKey = String(config.geminiApiKey || '').trim()

  const usable = (text: string | null) =>
    text && !isCreditError(text) ? text : null

  if (deepseekKey) {
    const text = usable(
      await completeOpenAiCompat(
        'https://api.deepseek.com/chat/completions',
        deepseekKey,
        'deepseek-chat',
        messages,
        temperature,
      ),
    )
    if (text) return text
  }
  if (groqKey) {
    const text = usable(
      await completeOpenAiCompat(
        'https://api.groq.com/openai/v1/chat/completions',
        groqKey,
        'llama-3.1-8b-instant',
        messages,
        temperature,
      ),
    )
    if (text) return text
  }
  if (geminiKey) {
    const text = usable(await completeWithGemini(geminiKey, messages, temperature))
    if (text) return text
  }

  try {
    return usable(await completeWithPollinations(messages))
  } catch (error: any) {
    if (error?.statusCode && error.statusCode !== 502 && error.statusCode !== 429) {
      throw error
    }
    return null
  }
}
