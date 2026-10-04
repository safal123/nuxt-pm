import prisma from '~/lib/prisma'
import { workspaceAccessWhere } from '~/server/utils/workspace'
import { personSelect, serializePerson } from '~/server/utils/person'
import { taskBoardInclude, serializeTask } from '~/server/utils/task'
import { needsSync } from '~/server/utils/google-calendar-events'
import { listGoogleCalendars, syncGoogleConnection } from '~/server/utils/google-calendar'
import { CALENDAR_CONNECTION_DEFAULT_COLOR } from '~/utils/calendar'
import type { z } from 'zod'
import type {
  calendarEventCreateSchema,
  calendarEventUpdateSchema,
} from '~/server/utils/schemas'

type EventCreateInput = z.infer<typeof calendarEventCreateSchema>
type EventUpdateInput = z.infer<typeof calendarEventUpdateSchema>

const DAY_MS = 86_400_000
/** Past this the calendar answers with what is stored; the sync keeps going. */
const LAZY_SYNC_WAIT_MS = 6_000

const eventInclude = {
  creator: { select: personSelect },
} as const

const utcMidnight = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))

/** All-day events are date ranges, so drop any time the client sent. */
const normalizeRange = (startAt: Date, endAt: Date, allDay: boolean) => {
  if (endAt < startAt) {
    throw createError({ statusCode: 400, message: 'The event must end after it starts.' })
  }
  return allDay
    ? { startAt: utcMidnight(startAt), endAt: utcMidnight(endAt) }
    : { startAt, endAt }
}

export const serializeCalendarEvent = (event: any) => ({
  id: event.id,
  title: event.title,
  description: event.description ?? null,
  location: event.location ?? null,
  startAt: event.startAt,
  endAt: event.endAt,
  allDay: event.allDay,
  color: event.color ?? null,
  projectId: event.projectId,
  workspaceId: event.workspaceId,
  provider: event.provider,
  connectionId: event.connectionId ?? null,
  externalUrl: event.externalUrl ?? null,
  createdBy: event.createdBy,
  creator: event.creator ? serializePerson(event.creator) : null,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
})

/** 404 unless the event's project is reachable through the user's workspaces. */
export const validateCalendarEventAccess = async (eventId: string, userId: string) => {
  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, project: { workspace: workspaceAccessWhere(userId) } },
  })
  if (!event) {
    throw createError({ statusCode: 404, message: 'Event not found or you do not have access.' })
  }
  return event
}

const connectionInclude = {
  user: { select: personSelect },
} as const

export const serializeCalendarConnection = (connection: any) => ({
  id: connection.id,
  provider: connection.provider,
  externalCalendarId: connection.externalCalendarId,
  name: connection.name,
  color: connection.color ?? null,
  projectId: connection.projectId,
  userId: connection.userId,
  owner: connection.user ? serializePerson(connection.user) : null,
  lastSyncedAt: connection.lastSyncedAt ?? null,
  lastError: connection.lastError ?? null,
  createdAt: connection.createdAt,
})

/** Sync connections whose stored window is stale or does not cover the range. */
const syncStaleConnections = async (projectId: string, range: { from: Date; to: Date }) => {
  const now = new Date()
  const connections = await prisma.calendarConnection.findMany({ where: { projectId } })
  const stale = connections.filter((connection) => needsSync(connection, range, now))
  if (!stale.length) return

  await Promise.race([
    Promise.all(stale.map((connection) => syncGoogleConnection(connection, range))),
    new Promise((resolve) => setTimeout(resolve, LAZY_SYNC_WAIT_MS)),
  ])
}

/** Events overlapping the range plus open cards due inside it. */
export const listProjectCalendar = async (
  projectId: string,
  userId: string,
  range: { from: Date; to: Date },
) => {
  // All-day rows sit at UTC midnight, which can fall a day outside the
  // caller's local range, so widen by a day and let the client place them.
  const from = new Date(range.from.getTime() - DAY_MS)
  const to = new Date(range.to.getTime() + DAY_MS)

  await syncStaleConnections(projectId, { from, to })

  const [events, tasks, connections] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { projectId, startAt: { lt: to }, endAt: { gte: from } },
      include: eventInclude,
      orderBy: [{ allDay: 'desc' }, { startAt: 'asc' }],
    }),
    prisma.task.findMany({
      where: {
        projectId,
        archivedAt: null,
        dueDate: { gte: from, lt: to },
      },
      include: { ...taskBoardInclude(userId), column: { select: { name: true } } },
      orderBy: [{ dueDate: 'asc' }, { order: 'asc' }],
    }),
    prisma.calendarConnection.findMany({
      where: { projectId },
      include: connectionInclude,
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return {
    events: events.map(serializeCalendarEvent),
    tasks: tasks.map((task) => serializeTask(task, { compact: true })),
    connections: connections.map(serializeCalendarConnection),
  }
}

/** 404 unless the connection's project is reachable through the user's workspaces. */
export const validateCalendarConnectionAccess = async (connectionId: string, userId: string) => {
  const connection = await prisma.calendarConnection.findFirst({
    where: { id: connectionId, project: { workspace: workspaceAccessWhere(userId) } },
    include: { project: { select: { workspace: { select: { createdBy: true } } } } },
  })
  if (!connection) {
    throw createError({ statusCode: 404, message: 'Calendar connection not found or you do not have access.' })
  }
  return connection
}

/** Show one of the user's Google calendars in a project and pull its events. */
export const createGoogleCalendarConnection = async (input: {
  projectId: string
  workspaceId: string
  userId: string
  calendarId: string
  color?: string | null
}) => {
  const calendar = (await listGoogleCalendars(input.userId))
    .find((item) => item.id === input.calendarId)
  if (!calendar) {
    throw createError({ statusCode: 404, message: 'That Google calendar was not found on your account.' })
  }

  const existing = await prisma.calendarConnection.findUnique({
    where: {
      projectId_provider_externalCalendarId: {
        projectId: input.projectId,
        provider: 'GOOGLE',
        externalCalendarId: calendar.id,
      },
    },
  })
  if (existing) {
    throw createError({ statusCode: 409, message: `"${calendar.name}" is already on this project calendar.` })
  }

  const connection = await prisma.calendarConnection.create({
    data: {
      projectId: input.projectId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      provider: 'GOOGLE',
      externalCalendarId: calendar.id,
      name: calendar.name,
      color: input.color ?? CALENDAR_CONNECTION_DEFAULT_COLOR,
    },
  })
  await syncGoogleConnection(connection)
  return refreshedConnection(connection.id)
}

export const syncCalendarConnection = async (
  connection: Parameters<typeof syncGoogleConnection>[0],
  range?: { from: Date; to: Date },
) => {
  await syncGoogleConnection(connection, range)
  return refreshedConnection(connection.id)
}

const refreshedConnection = async (connectionId: string) =>
  serializeCalendarConnection(await prisma.calendarConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: connectionInclude,
  }))

/** Whoever connected it, or the workspace owner, may remove it. */
export const deleteCalendarConnection = async (
  connection: Awaited<ReturnType<typeof validateCalendarConnectionAccess>>,
  userId: string,
) => {
  if (connection.userId !== userId && connection.project.workspace.createdBy !== userId) {
    throw createError({ statusCode: 403, message: 'Only the person who connected this calendar or the workspace owner can remove it.' })
  }
  await prisma.calendarConnection.delete({ where: { id: connection.id } })
}

export const createCalendarEvent = async (input: EventCreateInput & {
  projectId: string
  workspaceId: string
  userId: string
}) => {
  const range = normalizeRange(input.startAt, input.endAt, input.allDay)
  const event = await prisma.calendarEvent.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      allDay: input.allDay,
      color: input.color ?? null,
      ...range,
      projectId: input.projectId,
      workspaceId: input.workspaceId,
      createdBy: input.userId,
    },
    include: eventInclude,
  })
  return serializeCalendarEvent(event)
}

export const updateCalendarEvent = async (
  existing: { id: string; startAt: Date; endAt: Date; allDay: boolean },
  input: EventUpdateInput,
) => {
  const allDay = input.allDay ?? existing.allDay
  const range = normalizeRange(
    input.startAt ?? existing.startAt,
    input.endAt ?? existing.endAt,
    allDay,
  )
  const event = await prisma.calendarEvent.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      description: input.description,
      location: input.location,
      color: input.color,
      allDay,
      ...range,
    },
    include: eventInclude,
  })
  return serializeCalendarEvent(event)
}
