const DAY_MS = 86_400_000

/** How far around "now" a sync reaches when nothing wider is being viewed. */
export const SYNC_PAST_DAYS = 7
export const SYNC_FUTURE_DAYS = 60
/** A window wider than this is a jump far away; sync just what is on screen. */
const SYNC_MAX_SPAN_DAYS = 400
/** Imported events are re-read at most this often per connection. */
export const SYNC_TTL_MS = 5 * 60_000

export type GoogleEventTime = { date?: string; dateTime?: string; timeZone?: string }

export type GoogleEventItem = {
  id?: string
  status?: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start?: GoogleEventTime
  end?: GoogleEventTime
}

export type ImportedEvent = {
  externalId: string
  title: string
  description: string | null
  location: string | null
  startAt: Date
  endAt: Date
  allDay: boolean
  externalUrl: string | null
}

export type SyncWindow = { from: Date; to: Date }

const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`)

const plainText = (value?: string) => {
  if (!value) return null
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text ? text.slice(0, 5000) : null
}

/**
 * Google event → calendar_events row. All-day events use the same UTC-midnight
 * dates as local ones; Google's all-day `end.date` is exclusive, ours inclusive.
 */
export const mapGoogleEvent = (item: GoogleEventItem): ImportedEvent | null => {
  if (!item.id || item.status === 'cancelled' || !item.start) return null

  let startAt: Date
  let endAt: Date
  let allDay = false

  if (item.start.date) {
    allDay = true
    startAt = dateOnly(item.start.date)
    const exclusiveEnd = item.end?.date ? dateOnly(item.end.date) : null
    endAt = exclusiveEnd && exclusiveEnd > startAt
      ? new Date(exclusiveEnd.getTime() - DAY_MS)
      : startAt
  } else if (item.start.dateTime) {
    startAt = new Date(item.start.dateTime)
    endAt = item.end?.dateTime ? new Date(item.end.dateTime) : startAt
    if (endAt < startAt) endAt = startAt
  } else {
    return null
  }

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return null

  return {
    externalId: item.id,
    title: (item.summary?.trim() || '(No title)').slice(0, 200),
    description: plainText(item.description),
    location: item.location?.trim().slice(0, 500) || null,
    startAt,
    endAt,
    allDay,
    externalUrl: item.htmlLink ?? null,
  }
}

/** Default window around now, stretched to cover what the user is looking at. */
export const syncWindowFor = (now: Date, range?: SyncWindow): SyncWindow => {
  const base = {
    from: new Date(now.getTime() - SYNC_PAST_DAYS * DAY_MS),
    to: new Date(now.getTime() + SYNC_FUTURE_DAYS * DAY_MS),
  }
  if (!range) return base

  const from = range.from < base.from ? range.from : base.from
  const to = range.to > base.to ? range.to : base.to
  if ((to.getTime() - from.getTime()) / DAY_MS <= SYNC_MAX_SPAN_DAYS) return { from, to }

  return {
    from: new Date(range.from.getTime() - DAY_MS),
    to: new Date(range.to.getTime() + DAY_MS),
  }
}

/**
 * Stale, never synced, or the range sits outside what was last pulled. A
 * failed attempt also waits out the TTL so a broken token is not retried on
 * every page load.
 */
export const needsSync = (
  connection: {
    lastSyncedAt: Date | null
    syncedFrom: Date | null
    syncedTo: Date | null
    lastError: string | null
  },
  range: SyncWindow,
  now: Date,
) => {
  if (!connection.lastSyncedAt) return true
  const stale = now.getTime() - connection.lastSyncedAt.getTime() > SYNC_TTL_MS
  if (stale) return true
  if (connection.lastError) return false
  if (!connection.syncedFrom || !connection.syncedTo) return true
  return range.from < connection.syncedFrom || range.to > connection.syncedTo
}
