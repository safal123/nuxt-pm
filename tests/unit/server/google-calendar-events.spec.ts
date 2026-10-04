import { describe, expect, it } from 'vitest'
import {
  SYNC_TTL_MS,
  mapGoogleEvent,
  needsSync,
  syncWindowFor,
} from '~/server/utils/google-calendar-events'

const DAY = 86_400_000

describe('mapGoogleEvent', () => {
  it('maps a timed event', () => {
    const event = mapGoogleEvent({
      id: 'abc',
      summary: '  Standup ',
      htmlLink: 'https://calendar.google.com/event?eid=abc',
      start: { dateTime: '2026-10-05T09:00:00+11:00' },
      end: { dateTime: '2026-10-05T09:15:00+11:00' },
    })
    expect(event).toMatchObject({
      externalId: 'abc',
      title: 'Standup',
      allDay: false,
      externalUrl: 'https://calendar.google.com/event?eid=abc',
    })
    expect(event!.startAt.toISOString()).toBe('2026-10-04T22:00:00.000Z')
    expect(event!.endAt.toISOString()).toBe('2026-10-04T22:15:00.000Z')
  })

  it('turns the exclusive all-day end date into an inclusive one', () => {
    const single = mapGoogleEvent({ id: 'a', start: { date: '2026-10-05' }, end: { date: '2026-10-06' } })
    expect(single!.allDay).toBe(true)
    expect(single!.startAt.toISOString()).toBe('2026-10-05T00:00:00.000Z')
    expect(single!.endAt.toISOString()).toBe('2026-10-05T00:00:00.000Z')

    const trip = mapGoogleEvent({ id: 'b', start: { date: '2026-10-05' }, end: { date: '2026-10-08' } })
    expect(trip!.endAt.toISOString()).toBe('2026-10-07T00:00:00.000Z')
  })

  it('skips cancelled or malformed events and fills a missing title', () => {
    expect(mapGoogleEvent({ id: 'x', status: 'cancelled', start: { date: '2026-10-05' } })).toBeNull()
    expect(mapGoogleEvent({ id: 'y' })).toBeNull()
    expect(mapGoogleEvent({ start: { date: '2026-10-05' } })).toBeNull()
    expect(mapGoogleEvent({ id: 'z', start: { date: '2026-10-05' } })!.title).toBe('(No title)')
  })

  it('strips HTML from descriptions', () => {
    const event = mapGoogleEvent({
      id: 'h',
      description: '<b>Agenda</b><br>1. Plan &amp; review',
      start: { date: '2026-10-05' },
    })
    expect(event!.description).toBe('Agenda\n1. Plan & review')
  })
})

describe('sync window', () => {
  const now = new Date('2026-10-03T12:00:00Z')

  it('covers the default window and stretches to the visible range', () => {
    const base = syncWindowFor(now)
    expect(base.from.getTime()).toBe(now.getTime() - 7 * DAY)
    expect(base.to.getTime()).toBe(now.getTime() + 60 * DAY)

    const later = syncWindowFor(now, {
      from: new Date('2026-12-01T00:00:00Z'),
      to: new Date('2027-01-05T00:00:00Z'),
    })
    expect(later.from).toEqual(base.from)
    expect(later.to.toISOString()).toBe('2027-01-05T00:00:00.000Z')
  })

  it('syncs only the visible range when it is far from now', () => {
    const far = syncWindowFor(now, {
      from: new Date('2028-03-01T00:00:00Z'),
      to: new Date('2028-04-01T00:00:00Z'),
    })
    expect(far.from.toISOString()).toBe('2028-02-29T00:00:00.000Z')
    expect(far.to.toISOString()).toBe('2028-04-02T00:00:00.000Z')
  })

  it('decides when a connection needs a sync', () => {
    const range = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-31T00:00:00Z') }
    const fresh = {
      lastSyncedAt: new Date(now.getTime() - 60_000),
      syncedFrom: new Date('2026-09-26T00:00:00Z'),
      syncedTo: new Date('2026-12-02T00:00:00Z'),
      lastError: null,
    }
    expect(needsSync({ ...fresh, lastSyncedAt: null }, range, now)).toBe(true)
    expect(needsSync(fresh, range, now)).toBe(false)
    expect(needsSync(fresh, { ...range, to: new Date('2027-01-01T00:00:00Z') }, now)).toBe(true)
    expect(needsSync({ ...fresh, lastSyncedAt: new Date(now.getTime() - SYNC_TTL_MS - 1) }, range, now)).toBe(true)
    expect(needsSync({ ...fresh, syncedTo: null, lastError: 'expired' }, range, now)).toBe(false)
  })
})
