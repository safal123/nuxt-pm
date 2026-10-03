/** Local hour after which the digest covers tomorrow instead of today. */
export const REMINDER_SEND_HOUR = 9

export const DEFAULT_REMINDER_TIMEZONE = 'UTC'

export const isValidTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

const zonedParts = (instant: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  }
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Calendar day of `instant` in `timeZone`, e.g. "2026-10-05". */
export const zonedDayKey = (instant: Date, timeZone: string) => {
  const { year, month, day } = zonedParts(instant, timeZone)
  return `${year}-${pad(month)}-${pad(day)}`
}

export const nextDayKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
}

/** Date-only values (card due dates, all-day events) are stored at UTC midnight. */
export const utcMidnight = (key: string) => new Date(`${key}T00:00:00.000Z`)

const offsetMs = (instant: Date, timeZone: string) => {
  const { year, month, day, hour, minute, second } = zonedParts(instant, timeZone)
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/** The instant local midnight of `key` begins in `timeZone`, DST included. */
export const zonedDayStart = (key: string, timeZone: string) => {
  const guess = utcMidnight(key).getTime()
  const first = guess - offsetMs(new Date(guess), timeZone)
  return new Date(guess - offsetMs(new Date(first), timeZone))
}

export const zonedDayRange = (key: string, timeZone: string) => ({
  start: zonedDayStart(key, timeZone),
  end: zonedDayStart(nextDayKey(key), timeZone),
})

/**
 * Which local day a digest sent now should cover. From 9am it previews
 * tomorrow; before that, the rest of today. One digest per user per day, so a
 * daily cron and a 15-minute cron both send at most once.
 */
export const digestTarget = (
  now: Date,
  timeZone: string,
  sendHour = REMINDER_SEND_HOUR,
) => {
  const today = zonedDayKey(now, timeZone)
  const { hour } = zonedParts(now, timeZone)
  return hour >= sendHour
    ? { forDate: nextDayKey(today), when: 'tomorrow' as const }
    : { forDate: today, when: 'today' as const }
}
