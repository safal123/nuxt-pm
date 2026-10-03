import prisma from '~/lib/prisma'
import { workspaceAccessWhere } from '~/server/utils/workspace'
import { personSelect, serializePerson } from '~/server/utils/person'
import { taskBoardInclude, serializeTask } from '~/server/utils/task'
import type { z } from 'zod'
import type {
  calendarEventCreateSchema,
  calendarEventUpdateSchema,
} from '~/server/utils/schemas'

type EventCreateInput = z.infer<typeof calendarEventCreateSchema>
type EventUpdateInput = z.infer<typeof calendarEventUpdateSchema>

const DAY_MS = 86_400_000

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

  const [events, tasks] = await Promise.all([
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
  ])

  return {
    events: events.map(serializeCalendarEvent),
    tasks: tasks.map((task) => serializeTask(task, { compact: true })),
  }
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
