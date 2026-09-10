import prisma from '~/lib/prisma'
import { serializePerson } from '~/server/utils/person'

/** Workspace-scoped event log. Pass projectId/taskId when the subject has one. */

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
})

export const logActivity = async (input: {
  userId: string
  type: string
  message: string
  metadata?: Record<string, unknown> | null
  workspaceId: string
  projectId?: string | null
  taskId?: string | null
}) => {
  await prisma.activity.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      metadata: input.metadata ?? undefined,
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
    },
  })
}
