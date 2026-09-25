export const SUMMARIZABLE_TYPES = ['Task', 'Project'] as const
export type SummarizableType = (typeof SUMMARIZABLE_TYPES)[number]

export const UNLIMITED_SUMMARY_EMAILS = ['pokharelsafal66@gmail.com'] as const

export const canBypassSummaryLimit = (email?: string | null) => {
  const normalized = email?.trim().toLowerCase()
  return Boolean(
    normalized &&
      UNLIMITED_SUMMARY_EMAILS.includes(
        normalized as (typeof UNLIMITED_SUMMARY_EMAILS)[number],
      ),
  )
}

export const startOfUtcDay = (value: Date = new Date()) => {
  const date = new Date(value)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

export const wasGeneratedToday = (value: Date | string | null | undefined) => {
  if (!value) return false
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() >= startOfUtcDay().getTime()
}

export const isSummaryLimitedToday = (
  generatedAt: Date | string | null | undefined,
  email?: string | null,
) => wasGeneratedToday(generatedAt) && !canBypassSummaryLimit(email)

const BULLET_PREFIX = /^\s*(?:[-*•]|\d+[.)])\s*/

/** Stored summaries are newline-separated bullets; older ones may be paragraphs. */
export const summaryBullets = (text: string | null | undefined) => {
  if (!text?.trim()) return []
  const lines = text
    .split('\n')
    .map((line) => line.replace(BULLET_PREFIX, '').trim())
    .filter(Boolean)
  if (lines.length > 1) return lines
  return (lines[0] ?? '')
    .split(/(?<=[.!?])\s+(?=[A-Z"“])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}
