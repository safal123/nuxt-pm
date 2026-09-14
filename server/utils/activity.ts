import { getHeader } from 'h3'
import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { publishRealtime } from '~/server/utils/ably'
import { personSelect, serializePerson } from '~/server/utils/person'
import { REALTIME_CLIENT_HEADER, workspaceChannel } from '~/utils/realtime'

/** Workspace-scoped event log. Pass projectId/taskId when the subject has one. */

const activityInclude = {
  user: { select: personSelect },
  task: { select: { id: true, title: true } },
  project: { select: { id: true, name: true } },
} as const

export const serializeActivity = (activity: any) => ({
  id: activity.id,
  type: activity.type,
  message: activity.message,
  metadata: activity.metadata ?? null,
  createdAt: activity.createdAt,
  user: serializePerson(activity.user),
})

export const serializeFeedActivity = (activity: any) => ({
  ...serializeActivity(activity),
  task: activity.task ? { id: activity.task.id, title: activity.task.title } : null,
  project: activity.project
    ? { id: activity.project.id, name: activity.project.name }
    : null,
  email: activity.email ?? null,
})

const clientIdFromRequest = () => {
  try {
    return getHeader(useEvent(), REALTIME_CLIENT_HEADER) ?? null
  } catch {
    return null
  }
}

export const logActivity = async (input: {
  userId: string
  type: string
  message: string
  metadata?: Record<string, unknown> | null
  workspaceId: string
  projectId?: string | null
  taskId?: string | null
}) => {
  const created = await prisma.activity.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
    },
    include: activityInclude,
  })

  const activity = serializeFeedActivity(created)
  await publishRealtime(
    workspaceChannel(input.workspaceId),
    { type: 'activity.created', activity },
    clientIdFromRequest(),
  )
  return activity
}
