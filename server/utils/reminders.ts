import { systemPrisma as prisma } from '~/lib/prisma'
import { workspaceAccessWhere } from '~/server/utils/workspace'
import { sendReminderDigestEmail, type ReminderDigestItem } from '~/server/utils/email'
import {
  DEFAULT_REMINDER_TIMEZONE,
  digestTarget,
  isValidTimeZone,
  utcMidnight,
  zonedDayRange,
} from '~/server/utils/reminder-time'

type ReminderUser = {
  id: string
  email: string
  name: string | null
  timezone: string | null
  subdomain: string | null
}

/** Workspaces the user can open whose owner has not switched reminders off. */
const reminderWorkspaceWhere = (userId: string) => ({
  AND: [
    workspaceAccessWhere(userId),
    { NOT: { settings: { is: { emailReminders: false } } } },
  ],
})

export const collectDigestItems = async (
  userId: string,
  forDate: string,
  timeZone: string,
  now: Date,
): Promise<ReminderDigestItem[]> => {
  const range = zonedDayRange(forDate, timeZone)
  const from = range.start > now ? range.start : now
  const projectWhere = { archivedAt: null, workspace: reminderWorkspaceWhere(userId) }
  const projectSelect = {
    select: { id: true, name: true, workspaceId: true, workspace: { select: { name: true } } },
  }

  const [events, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        project: projectWhere,
        OR: [
          { allDay: false, startAt: { gte: from, lt: range.end } },
          { allDay: true, startAt: utcMidnight(forDate) },
        ],
      },
      include: { project: projectSelect },
      orderBy: [{ allDay: 'desc' }, { startAt: 'asc' }],
    }),
    prisma.task.findMany({
      where: {
        archivedAt: null,
        status: { not: 'DONE' },
        dueDate: utcMidnight(forDate),
        project: projectWhere,
        OR: [
          { members: { some: { userId } } },
          { assigneeId: userId },
          { members: { none: {} }, assigneeId: null, createdBy: userId },
        ],
      },
      include: { project: projectSelect, column: { select: { name: true } } },
      orderBy: [{ priority: 'desc' }, { order: 'asc' }],
    }),
  ])

  return [
    ...events.map((event) => ({
      kind: 'event' as const,
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: event.allDay,
      location: event.location,
      color: event.color,
      projectId: event.project.id,
      projectName: event.project.name,
      workspaceId: event.project.workspaceId,
      workspaceName: event.project.workspace.name,
    })),
    ...tasks.map((task) => ({
      kind: 'task' as const,
      id: task.id,
      title: task.title,
      startAt: task.dueDate!,
      endAt: task.dueDate!,
      allDay: true,
      priority: task.priority,
      columnName: task.column?.name ?? null,
      projectId: task.project.id,
      projectName: task.project.name,
      workspaceId: task.project.workspaceId,
      workspaceName: task.project.workspace.name,
    })),
  ]
}

export type ReminderRunResult = {
  checked: number
  sent: number
  empty: number
  alreadySent: number
  failed: number
  preview?: { email: string; forDate: string; items: number }[]
}

/**
 * Sends each opted-in user at most one digest per local day. Safe to call as
 * often as you like: the (user, day) row is claimed before the email goes out
 * and released again if Resend fails, so the next run retries.
 */
export const runReminderDigests = async (options: {
  origin: (user: ReminderUser) => string
  now?: Date
  userIds?: string[]
  dryRun?: boolean
}): Promise<ReminderRunResult> => {
  const now = options.now ?? new Date()
  const users = await prisma.user.findMany({
    where: {
      reminderEmails: true,
      ...(options.userIds ? { id: { in: options.userIds } } : {}),
    },
    select: { id: true, email: true, name: true, timezone: true, subdomain: true },
  })

  const result: ReminderRunResult = {
    checked: users.length,
    sent: 0,
    empty: 0,
    alreadySent: 0,
    failed: 0,
    ...(options.dryRun ? { preview: [] } : {}),
  }

  for (const user of users) {
    const timeZone =
      user.timezone && isValidTimeZone(user.timezone)
        ? user.timezone
        : DEFAULT_REMINDER_TIMEZONE
    const target = digestTarget(now, timeZone)

    const existing = await prisma.reminderDigest.findUnique({
      where: { userId_forDate: { userId: user.id, forDate: target.forDate } },
      select: { id: true },
    })
    if (existing) {
      result.alreadySent += 1
      continue
    }

    const items = await collectDigestItems(user.id, target.forDate, timeZone, now)
    if (!items.length) {
      result.empty += 1
      continue
    }

    if (options.dryRun) {
      result.preview!.push({ email: user.email, forDate: target.forDate, items: items.length })
      continue
    }

    const claim = await prisma.reminderDigest
      .create({
        data: { userId: user.id, forDate: target.forDate, itemCount: items.length },
      })
      .catch((error: { code?: string }) => {
        if (error?.code === 'P2002') return null
        throw error
      })
    if (!claim) {
      result.alreadySent += 1
      continue
    }

    const { error } = await sendReminderDigestEmail({
      to: user.email,
      name: user.name,
      userId: user.id,
      forDate: target.forDate,
      when: target.when,
      timeZone,
      items,
      origin: options.origin(user),
    })

    if (error) {
      await prisma.reminderDigest.delete({ where: { id: claim.id } })
      result.failed += 1
    } else {
      await prisma.reminderDigest.update({ where: { id: claim.id }, data: { status: 'sent' } })
      result.sent += 1
    }
  }

  return result
}
