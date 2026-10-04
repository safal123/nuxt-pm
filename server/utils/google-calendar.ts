import { systemPrisma } from '~/lib/prisma'
import { auth, googleEnabled } from '~/lib/auth'
import { GOOGLE_CALENDAR_SCOPE } from '~/utils/calendar'
import {
  mapGoogleEvent,
  syncWindowFor,
  type GoogleEventItem,
  type SyncWindow,
} from '~/server/utils/google-calendar-events'

const API = 'https://www.googleapis.com/calendar/v3'
const MAX_EVENT_PAGES = 4
const UPSERT_BATCH = 25

export type GoogleCalendarSummary = {
  id: string
  name: string
  primary: boolean
  color: string | null
  accessRole: string
}

type ConnectionRow = {
  id: string
  projectId: string
  workspaceId: string
  userId: string
  externalCalendarId: string
  color: string | null
}

const hasScope = (scope: string | null | undefined, wanted: string) =>
  (scope ?? '').split(/[\s,]+/).includes(wanted)

/**
 * Tokens live in `accounts`, which tenants cannot read, so every lookup here
 * goes through the system client.
 */
const googleAccount = (userId: string) =>
  systemPrisma.account.findFirst({
    where: { userId, providerId: 'google' },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, scope: true, refreshToken: true },
  })

export const googleCalendarStatus = async (userId: string) => {
  if (!googleEnabled) return { available: false, linked: false, authorized: false }
  const account = await googleAccount(userId)
  return {
    available: true,
    linked: Boolean(account),
    authorized: Boolean(account && hasScope(account.scope, GOOGLE_CALENDAR_SCOPE)),
  }
}

const reconnectError = () =>
  createError({
    statusCode: 409,
    message: 'Google Calendar access is missing or expired. Connect Google Calendar again.',
  })

/** A fresh access token; Better Auth refreshes it with the stored refresh token. */
const googleAccessToken = async (userId: string) => {
  const account = await googleAccount(userId)
  if (!account || !hasScope(account.scope, GOOGLE_CALENDAR_SCOPE)) throw reconnectError()
  try {
    const { accessToken } = await auth.api.getAccessToken({
      body: { accountId: account.id, userId },
    })
    if (!accessToken) throw reconnectError()
    return accessToken
  } catch {
    throw reconnectError()
  }
}

const googleError = (error: any) => {
  const status = error?.status ?? error?.response?.status
  if (status === 401 || status === 403) return reconnectError()
  if (status === 404) {
    return createError({ statusCode: 404, message: 'That Google calendar no longer exists or is not shared with you.' })
  }
  const message = error?.data?.error?.message
  return createError({
    statusCode: 502,
    message: message ? `Google Calendar: ${message}` : 'Could not reach Google Calendar.',
  })
}

const googleGet = async <T>(token: string, path: string, query: Record<string, any> = {}) => {
  try {
    return await $fetch<T>(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      query,
      timeout: 10_000,
    })
  } catch (error) {
    throw googleError(error)
  }
}

export const listGoogleCalendars = async (userId: string): Promise<GoogleCalendarSummary[]> => {
  const token = await googleAccessToken(userId)
  const calendars: GoogleCalendarSummary[] = []
  let pageToken: string | undefined
  do {
    const page = await googleGet<{ items?: any[]; nextPageToken?: string }>(
      token,
      '/users/me/calendarList',
      { minAccessRole: 'reader', maxResults: 250, pageToken },
    )
    for (const item of page.items ?? []) {
      if (item.deleted || item.hidden) continue
      calendars.push({
        id: item.id,
        name: item.summaryOverride || item.summary || item.id,
        primary: Boolean(item.primary),
        color: item.backgroundColor ?? null,
        accessRole: item.accessRole,
      })
    }
    pageToken = page.nextPageToken
  } while (pageToken)

  return calendars.sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name))
}

const fetchGoogleEvents = async (token: string, calendarId: string, window: SyncWindow) => {
  const items: GoogleEventItem[] = []
  let pageToken: string | undefined
  let pages = 0
  do {
    const page = await googleGet<{ items?: GoogleEventItem[]; nextPageToken?: string }>(
      token,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        timeMin: window.from.toISOString(),
        timeMax: window.to.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
        pageToken,
      },
    )
    items.push(...(page.items ?? []))
    pageToken = page.nextPageToken
    pages += 1
  } while (pageToken && pages < MAX_EVENT_PAGES)
  return items
}

// Two tabs opening the calendar at once should share one sync, not race.
const inFlight = new Map<string, Promise<void>>()

/**
 * Pull the window from Google into `calendar_events`: upsert what Google has,
 * drop rows inside the window that Google no longer returns. Errors are kept
 * on the connection instead of failing the calendar request.
 */
export const syncGoogleConnection = (connection: ConnectionRow, range?: SyncWindow) => {
  const running = inFlight.get(connection.id)
  if (running) return running

  const task = runSync(connection, syncWindowFor(new Date(), range)).finally(() => {
    inFlight.delete(connection.id)
  })
  inFlight.set(connection.id, task)
  return task
}

const runSync = async (connection: ConnectionRow, window: SyncWindow) => {
  const now = new Date()
  try {
    const token = await googleAccessToken(connection.userId)
    const items = await fetchGoogleEvents(token, connection.externalCalendarId, window)
    const events = items.map(mapGoogleEvent).filter((event) => event !== null)

    for (let index = 0; index < events.length; index += UPSERT_BATCH) {
      await Promise.all(events.slice(index, index + UPSERT_BATCH).map((event) => {
        const fields = { ...event, color: connection.color, syncedAt: now }
        return systemPrisma.calendarEvent.upsert({
          where: {
            connectionId_externalId: { connectionId: connection.id, externalId: event.externalId },
          },
          create: {
            ...fields,
            provider: 'GOOGLE',
            connectionId: connection.id,
            projectId: connection.projectId,
            workspaceId: connection.workspaceId,
            createdBy: connection.userId,
          },
          update: fields,
        })
      }))
    }

    await systemPrisma.calendarEvent.deleteMany({
      where: {
        connectionId: connection.id,
        externalId: { notIn: events.map((event) => event.externalId) },
        startAt: { lt: window.to },
        endAt: { gte: window.from },
      },
    })

    await systemPrisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        syncedFrom: window.from,
        syncedTo: window.to,
        lastSyncedAt: now,
        lastError: null,
      },
    })
  } catch (error: any) {
    await systemPrisma.calendarConnection.updateMany({
      where: { id: connection.id },
      data: { lastSyncedAt: now, lastError: error?.message || 'Sync failed.' },
    })
  }
}
