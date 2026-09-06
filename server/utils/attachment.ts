import prisma from '~/lib/prisma'
import { validateTaskAccess } from '~/server/utils/task'
import { validateProjectAccess } from '~/server/utils/project'
import { validateWorkspace } from '~/server/utils/workspace'

export const ATTACHABLE_TYPES = ['Task', 'Project', 'Workspace', 'Comment'] as const
export type AttachableType = (typeof ATTACHABLE_TYPES)[number]

const uploaderSelect = {
  id: true,
  name: true,
  email: true,
  clerkObject: true
} as const

export const attachmentUploaderInclude = {
  uploader: { select: uploaderSelect }
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
 * Confirms the user can reach the parent record. Returns an owner id used
 * for delete permission (uploader or owner).
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
    return { attachableType, attachableId, ownerId: task.createdBy }
  }

  if (attachableType === 'Project') {
    const project = await validateProjectAccess(attachableId, userId)
    return { attachableType, attachableId, ownerId: project.createdBy }
  }

  if (attachableType === 'Workspace') {
    const workspace = await validateWorkspace(attachableId, userId)
    return { attachableType, attachableId, ownerId: workspace.createdBy }
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
  return { attachableType, attachableId, ownerId: comment.userId || task.createdBy }
}
