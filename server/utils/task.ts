import { format } from 'date-fns'
import prisma from '~/lib/prisma'
import { workspaceAccessWhere } from '~/server/utils/access'
import { serializeActivity } from '~/server/utils/activity'
import { personSelect, serializePerson } from '~/server/utils/person'

export const taskBoardInclude = (userId: string) => ({
  creator: { select: personSelect },
  assignee: { select: personSelect },
  members: {
    include: {
      user: { select: personSelect }
    }
  },
  taskLabels: {
    include: {
      label: true
    }
  },
  likes: {
    where: { userId },
    select: { userId: true }
  },
  _count: {
    select: {
      comments: true,
      likes: true
    }
  }
})

const serializeLabels = (task: any) => {
  if (!Array.isArray(task.taskLabels)) return []
  return task.taskLabels
    .map((link: any) => link.label)
    .filter(Boolean)
    .map((label: any) => ({
      id: label.id,
      name: label.name,
      color: label.color
    }))
}

export const serializeAttachment = (attachment: any) => ({
  id: attachment.id,
  name: attachment.name,
  url: attachment.url,
  size: attachment.size ?? null,
  mimeType: attachment.mimeType ?? null,
  attachableType: attachment.attachableType,
  attachableId: attachment.attachableId,
  createdAt: attachment.createdAt,
  uploadedBy: attachment.uploadedBy,
  uploader: attachment.uploader ? serializePerson(attachment.uploader) : null
})

export const serializeTask = (task: any, options?: { compact?: boolean }) => {
  const compact = options?.compact === true
  return {
    id: task.id,
    title: task.title,
    description: compact ? null : (task.description ?? null),
    order: task.order,
    priority: task.priority ?? 'MEDIUM',
    status: task.status ?? 'TODO',
    completedAt: task.completedAt ?? null,
    dueDate: task.dueDate,
    coverColor: task.coverColor ?? null,
    archivedAt: task.archivedAt ?? null,
    labels: serializeLabels(task),
    columnId: task.columnId,
    projectId: task.projectId,
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    columnName: task.column?.name ?? null,
    creator: task.creator ? serializePerson(task.creator) : null,
    assignee: task.assignee ? serializePerson(task.assignee) : null,
    members: Array.isArray(task.members)
      ? task.members.map((member: any) => serializePerson(member.user))
      : [],
    comments: compact
      ? undefined
      : Array.isArray(task.comments)
        ? task.comments.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            user: serializePerson(comment.user)
          }))
        : [],
    attachments: compact
      ? undefined
      : Array.isArray(task.attachments)
        ? task.attachments.map(serializeAttachment)
        : [],
    activities: compact
      ? undefined
      : Array.isArray(task.activities)
        ? task.activities.map(serializeActivity)
        : undefined,
    commentCount: task._count?.comments ?? task.comments?.length ?? 0,
    attachmentCount: task._count?.attachments ?? task.attachments?.length ?? 0,
    likeCount: task._count?.likes ?? 0,
    likedByMe: Array.isArray(task.likes) && task.likes.length > 0
  }
}

export const personName = (user: { name?: string | null; email?: string | null }) =>
  user.name || user.email || 'Someone'

const toDateKey = (value: Date | string | null | undefined) => {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export const formatDateLabel = (value: Date | string | null | undefined) => {
  const key = toDateKey(value)
  if (!key) return null
  return format(new Date(`${key}T12:00:00`), 'd MMM yyyy')
}

export const dateChangeEntry = (
  field: 'start date' | 'due date' | 'end date',
  previous: Date | string | null | undefined,
  next: Date | string | null | undefined
) => {
  const from = formatDateLabel(previous)
  const to = formatDateLabel(next)
  if (from === to) return null
  let message = `changed the ${field} from ${from} to ${to}`
  if (!from && to) message = `set the ${field} to ${to}`
  if (from && !to) message = `cleared the ${field}`
  return { field, from, to, message }
}

/** 404 unless the user can reach this task through the workspace. */
export const validateTaskAccess = async (taskId: string, userId: string) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        workspace: workspaceAccessWhere(userId),
      }
    },
    include: {
      project: { select: { workspaceId: true } },
    },
  })

  if (!task) {
    throw createError({
      statusCode: 404,
      message: 'Task not found or you do not have access.'
    })
  }

  return task
}

export const getTaskWithDetails = async (taskId: string, userId: string) => {
  const [task, attachments] = await Promise.all([
    prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        ...taskBoardInclude(userId),
        column: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: personSelect }
          }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: personSelect }
          }
        }
      }
    }),
    prisma.attachment.findMany({
      where: { attachableType: 'Task', attachableId: taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: { select: personSelect }
      }
    })
  ])

  return {
    ...task,
    attachments,
    _count: {
      ...task._count,
      attachments: attachments.length
    }
  }
}

export const syncTaskMembers = async (taskId: string, memberIds: string[]) => {
  const uniqueIds = [...new Set(memberIds.filter(Boolean))]
  const current = await prisma.taskMember.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, email: true } } }
  })
  const currentIds = current.map((row) => row.userId)
  const addedIds = uniqueIds.filter((id) => !currentIds.includes(id))
  const removed = current.filter((row) => !uniqueIds.includes(row.userId))

  await prisma.$transaction([
    prisma.taskMember.deleteMany({
      where: { taskId, userId: { notIn: uniqueIds } }
    }),
    ...uniqueIds.map((id) =>
      prisma.taskMember.upsert({
        where: { taskId_userId: { taskId, userId: id } },
        update: {},
        create: { taskId, userId: id }
      })
    ),
    prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: uniqueIds[0] ?? null }
    })
  ])

  const addedUsers = addedIds.length
    ? await prisma.user.findMany({
        where: { id: { in: addedIds } },
        select: { id: true, name: true, email: true }
      })
    : []

  return {
    added: addedUsers.map((user) => ({ id: user.id, name: personName(user) })),
    removed: removed.map((row) => ({ id: row.userId, name: personName(row.user) }))
  }
}

export const syncTaskLabels = async (
  taskId: string,
  projectId: string,
  labelIds: string[]
) => {
  const uniqueIds = [...new Set(labelIds.filter(Boolean))]
  const valid = uniqueIds.length
    ? await prisma.label.findMany({
        where: { id: { in: uniqueIds }, projectId }
      })
    : []
  const validIds = valid.map((label) => label.id)
  const current = await prisma.taskLabel.findMany({
    where: { taskId },
    include: { label: true }
  })
  const currentIds = current.map((row) => row.labelId)
  const added = valid.filter((label) => !currentIds.includes(label.id))
  const removed = current.filter((row) => !validIds.includes(row.labelId))

  await prisma.$transaction([
    prisma.taskLabel.deleteMany({
      where: { taskId, labelId: { notIn: validIds } }
    }),
    ...validIds.map((labelId) =>
      prisma.taskLabel.upsert({
        where: { taskId_labelId: { taskId, labelId } },
        update: {},
        create: { taskId, labelId }
      })
    )
  ])

  return {
    added: added.map((label) => ({ id: label.id, name: label.name })),
    removed: removed.map((row) => ({ id: row.labelId, name: row.label.name }))
  }
}

/** Rewrite `order` in the destination (and source, on a column change). */
export const moveTaskToIndex = async (
  taskId: string,
  columnId: string,
  index: number
) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) {
    throw createError({ statusCode: 404, message: 'Task not found.' })
  }

  const sourceColumnId = task.columnId

  const siblings = await prisma.task.findMany({
    where: { columnId, id: { not: taskId } },
    orderBy: { order: 'asc' },
    select: { id: true }
  })

  const clamped = Math.max(0, Math.min(index, siblings.length))
  const orderedIds = siblings.map((s) => s.id)
  orderedIds.splice(clamped, 0, taskId)

  const updates = orderedIds.map((id, order) =>
    prisma.task.update({
      where: { id },
      data: id === taskId ? { order, columnId } : { order }
    })
  )

  if (sourceColumnId !== columnId) {
    const leftover = await prisma.task.findMany({
      where: { columnId: sourceColumnId, id: { not: taskId } },
      orderBy: { order: 'asc' },
      select: { id: true }
    })
    leftover.forEach((row, order) => {
      updates.push(
        prisma.task.update({
          where: { id: row.id },
          data: { order }
        })
      )
    })
  }

  await prisma.$transaction(updates)
}
