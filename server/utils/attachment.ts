import prisma from '~/lib/prisma'
import { personSelect } from '~/server/utils/person'
import { validateTaskAccess } from '~/server/utils/task'
import { validateProjectAccess } from '~/server/utils/project'
import { validateWorkspaceAccess } from '~/server/utils/workspace'

export const ATTACHABLE_TYPES = ['Task', 'Project', 'Workspace', 'Comment'] as const
export type AttachableType = (typeof ATTACHABLE_TYPES)[number]

export const attachmentUploaderInclude = {
  uploader: { select: personSelect }
} as const

export const isAttachableType = (value: string): value is AttachableType =>
  ATTACHABLE_TYPES.includes(value as AttachableType)

export const listAttachments = async (attachableType: string, attachableId: string) => {
  return prisma.attachment.findMany({
    where: { attachableType, attachableId },
    orderBy: { createdAt: 'desc' },
    include: attachmentUploaderInclude
  })
}

export const countAttachmentsByIds = async (
  attachableType: string,
  attachableIds: string[]
) => {
  const counts = new Map<string, number>()
  if (!attachableIds.length) return counts

  const rows = await prisma.attachment.groupBy({
    by: ['attachableId'],
    where: { attachableType, attachableId: { in: attachableIds } },
    _count: { _all: true }
  })

  for (const row of rows) {
    counts.set(row.attachableId, row._count._all)
  }
  return counts
}

export const mergeTaskAttachmentCounts = async <T extends { id: string; _count?: any }>(
  tasks: T[]
) => {
  const counts = await countAttachmentsByIds(
    'Task',
    tasks.map((task) => task.id)
  )
  for (const task of tasks) {
    task._count = {
      ...task._count,
      attachments: counts.get(task.id) ?? 0
    }
  }
  return tasks
}

/**
 * Confirms the user can reach the parent record. Returns delete-permission
 * owner plus workspace/project/task ids for activity logging.
 */
export const validateAttachableAccess = async (
  attachableType: string,
  attachableId: string,
  userId: string
) => {
  if (!isAttachableType(attachableType)) {
    throw createError({
      statusCode: 400,
      message: 'That file cannot be attached to this kind of record.'
    })
  }

  if (attachableType === 'Task') {
    const task = await validateTaskAccess(attachableId, userId)
    return {
      attachableType,
      attachableId,
      ownerId: task.createdBy,
      workspaceId: task.project.workspaceId,
      projectId: task.projectId,
      taskId: task.id,
    }
  }

  if (attachableType === 'Project') {
    const project = await validateProjectAccess(attachableId, userId)
    return {
      attachableType,
      attachableId,
      ownerId: project.createdBy,
      workspaceId: project.workspaceId,
      projectId: project.id,
      taskId: null,
    }
  }

  if (attachableType === 'Workspace') {
    const workspace = await validateWorkspaceAccess(attachableId, userId)
    return {
      attachableType,
      attachableId,
      ownerId: workspace.createdBy,
      workspaceId: workspace.id,
      projectId: null,
      taskId: null,
    }
  }

  const comment = await prisma.taskComment.findUnique({
    where: { id: attachableId }
  })
  if (!comment) {
    throw createError({
      statusCode: 404,
      message: 'Comment not found or you do not have access.'
    })
  }
  const task = await validateTaskAccess(comment.taskId, userId)
  return {
    attachableType,
    attachableId,
    ownerId: comment.userId || task.createdBy,
    workspaceId: task.project.workspaceId,
    projectId: task.projectId,
    taskId: task.id,
  }
}
