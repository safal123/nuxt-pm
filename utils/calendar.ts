import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { CalendarEvent, CalendarViewMode, TaskPriority } from '~/types'

export type WeekStart = 0 | 1

export const CALENDAR_AGENDA_DAYS = 30
export const CALENDAR_SLOT_MINUTES = 30
export const CALENDAR_DEFAULT_COLOR = 'blue'

/** Card due dates are coloured by priority; overdue cards always read red. */
export const CALENDAR_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#64748b',
  MEDIUM: '#14b8a6',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
}
export const CALENDAR_OVERDUE_COLOR = '#dc2626'

/** Translucent wash of a hex colour that works on light and dark surfaces. */
export const tint = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`

/** Local calendar day, e.g. "2026-10-03". */
export const dayKey = (date: Date) => format(date, 'yyyy-MM-dd')

/** Date-only values (all-day events, task due dates) are stored at UTC midnight. */
export const dateOnlyKey = (value: Date | string) =>
  new Date(value).toISOString().slice(0, 10)

export const parseDayKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const dayDelta = (fromKey: string, toKey: string) =>
  differenceInCalendarDays(parseDayKey(toKey), parseDayKey(fromKey))

export const shiftDayKey = (key: string, days: number) =>
  dayKey(addDays(parseDayKey(key), days))

/** "09:30" on a local day. */
export const combineDayAndTime = (key: string, time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  const date = parseDayKey(key)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export const timeOfDay = (date: Date) => format(date, 'HH:mm')

/** Compact chip time: "9a", "9:30a". */
export const shortTime = (date: Date) =>
  format(date, date.getMinutes() ? 'h:mmaaaaa' : 'haaaaa')

export const timeRangeLabel = (start: Date, end: Date) =>
  `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`

export const roundToSlot = (date: Date, step = CALENDAR_SLOT_MINUTES) => {
  const rounded = new Date(date)
  rounded.setSeconds(0, 0)
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / step) * step)
  return rounded
}

export const timeSlots = (step = CALENDAR_SLOT_MINUTES) => {
  const slots: { value: string; label: string }[] = []
  const base = startOfDay(new Date(2000, 0, 1))
  for (let minutes = 0; minutes < 24 * 60; minutes += step) {
    const time = addMinutes(base, minutes)
    slots.push({ value: format(time, 'HH:mm'), label: format(time, 'h:mm a') })
  }
  return slots
}

export const monthGrid = (cursor: Date, weekStartsOn: WeekStart) => {
  const first = startOfWeek(startOfMonth(cursor), { weekStartsOn })
  return Array.from({ length: 42 }, (_, index) => addDays(first, index))
}

export const weekDays = (cursor: Date, weekStartsOn: WeekStart) => {
  const first = startOfWeek(cursor, { weekStartsOn })
  return Array.from({ length: 7 }, (_, index) => addDays(first, index))
}

/** Half-open local range [from, to) the view needs data for. */
export const visibleRange = (
  mode: CalendarViewMode,
  cursor: Date,
  weekStartsOn: WeekStart,
) => {
  if (mode === 'month') {
    const days = monthGrid(cursor, weekStartsOn)
    return { from: days[0], to: addDays(days[41], 1) }
  }
  if (mode === 'week') {
    const days = weekDays(cursor, weekStartsOn)
    return { from: days[0], to: addDays(days[6], 1) }
  }
  const from = startOfDay(cursor)
  return { from, to: addDays(from, CALENDAR_AGENDA_DAYS) }
}

/** Local day keys an event covers; a timed event ending at midnight stops the day before. */
export const eventDayKeys = (event: Pick<CalendarEvent, 'startAt' | 'endAt' | 'allDay'>) => {
  if (event.allDay) {
    const start = parseDayKey(dateOnlyKey(event.startAt))
    const end = parseDayKey(dateOnlyKey(event.endAt))
    const span = Math.max(0, differenceInCalendarDays(end, start))
    return Array.from({ length: span + 1 }, (_, index) => dayKey(addDays(start, index)))
  }
  const start = new Date(event.startAt)
  const rawEnd = new Date(event.endAt)
  const end = rawEnd > start ? new Date(rawEnd.getTime() - 1) : start
  const span = Math.max(0, differenceInCalendarDays(end, start))
  return Array.from({ length: span + 1 }, (_, index) => dayKey(addDays(start, index)))
}

/** True when a timed event belongs in the all-day strip (spans more than one day). */
export const isMultiDay = (event: Pick<CalendarEvent, 'startAt' | 'endAt' | 'allDay'>) =>
  event.allDay || eventDayKeys(event).length > 1

export const groupByDay = <T>(items: T[], keysOf: (item: T) => string[]) => {
  const map = new Map<string, T[]>()
  for (const item of items) {
    for (const key of keysOf(item)) {
      const list = map.get(key)
      if (list) list.push(item)
      else map.set(key, [item])
    }
  }
  return map
}

export type TimedLayout<T> = {
  item: T
  /** Minutes from local midnight, clipped to the day. */
  top: number
  height: number
  column: number
  columns: number
}

/**
 * Places same-day timed events side by side when they overlap, the way
 * Google / Outlook do: each overlap cluster splits its width evenly.
 */
export const layoutTimedEvents = <T extends { startAt: string; endAt: string }>(
  items: T[],
  day: Date,
  minHeight = 20,
) => {
  const dayStart = startOfDay(day).getTime()
  const dayEnd = endOfDay(day).getTime() + 1
  const sorted = items
    .map((item) => {
      const start = Math.max(new Date(item.startAt).getTime(), dayStart)
      const end = Math.min(Math.max(new Date(item.endAt).getTime(), start), dayEnd)
      return { item, start, end: Math.max(end, start + minHeight * 60_000) }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const placed: TimedLayout<T>[] = []
  let cluster: TimedLayout<T>[] = []
  let columnEnds: number[] = []
  let clusterEnd = -Infinity

  const closeCluster = () => {
    for (const entry of cluster) entry.columns = columnEnds.length
    cluster = []
    columnEnds = []
  }

  for (const entry of sorted) {
    if (entry.start >= clusterEnd) {
      closeCluster()
      clusterEnd = -Infinity
    }
    let column = columnEnds.findIndex((end) => end <= entry.start)
    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(entry.end)
    } else {
      columnEnds[column] = entry.end
    }
    clusterEnd = Math.max(clusterEnd, entry.end)
    const layout: TimedLayout<T> = {
      item: entry.item,
      top: (entry.start - dayStart) / 60_000,
      height: (entry.end - entry.start) / 60_000,
      column,
      columns: 1,
    }
    cluster.push(layout)
    placed.push(layout)
  }
  closeCluster()
  return placed
}

/** Moves an event to another day, keeping its time of day and duration. */
export const shiftEventToDay = (
  event: Pick<CalendarEvent, 'startAt' | 'endAt' | 'allDay'>,
  targetKey: string,
) => {
  if (event.allDay) {
    const start = parseDayKey(dateOnlyKey(event.startAt))
    const delta = differenceInCalendarDays(parseDayKey(targetKey), start)
    const end = parseDayKey(dateOnlyKey(event.endAt))
    return {
      startAt: targetKey,
      endAt: dayKey(addDays(end, delta)),
    }
  }
  const start = new Date(event.startAt)
  const delta = differenceInCalendarDays(parseDayKey(targetKey), startOfDay(start))
  return {
    startAt: addDays(start, delta).toISOString(),
    endAt: addDays(new Date(event.endAt), delta).toISOString(),
  }
}
