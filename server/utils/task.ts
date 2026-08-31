import prisma from '~/lib/prisma'

export const LABEL_COLORS = [
  { id: 'green', value: '#61bd4f', name: 'Green' },
  { id: 'yellow', value: '#f2d600', name: 'Yellow' },
  { id: 'orange', value: '#ff9f1a', name: 'Orange' },
  { id: 'red', value: '#eb5a46', name: 'Red' },
  { id: 'purple', value: '#c377e0', name: 'Purple' },
  { id: 'blue', value: '#0079bf', name: 'Blue' },
  { id: 'sky', value: '#00c2e0', name: 'Sky' },
  { id: 'lime', value: '#51e898', name: 'Lime' },
  { id: 'pink', value: '#ff78cb', name: 'Pink' },
  { id: 'black', value: '#344563', name: 'Black' }
] as const

const assigneeSelect = {
  id: true,
  name: true,
  email: true,
  clerkObject: true
} as const

export const taskBoardInclude = (userId: string) => ({
  creator: { select: assigneeSelect },
  assignee: { select: assigneeSelect },
  members: {
    include: {
      user: { select: assigneeSelect }
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
      attachments: true,
      likes: true
    }
  }
})

export const imageUrlFromClerk = (clerkObject: unknown) => {
  if (!clerkObject || typeof clerkObject !== 'object') return null
  const obj = clerkObject as Record<string, unknown>
  if (typeof obj.imageUrl === 'string') return obj.imageUrl
  if (typeof obj.image_url === 'string') return obj.image_url
  return null
}

export const serializePerson = (user: any) => ({
  id: user.id,
  name: user.name ?? null,
  email: user.email,
  imageUrl: imageUrlFromClerk(user.clerkObject)
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

export const serializeActivity = (activity: any) => ({
  id: activity.id,
  type: activity.type,
  message: activity.message,
  metadata: activity.metadata ?? null,
  createdAt: activity.createdAt,
  user: serializePerson(activity.user)
})

export const serializeTask = (task: any) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  order: task.order,
  priority: task.priority ?? 'MEDIUM',
  status: task.status ?? 'TODO',
  completedAt: task.completedAt ?? null,
  dueDate: task.dueDate,
  startDate: task.startDate ?? null,
  endDate: task.endDate ?? null,
  coverColor: task.coverColor ?? null,
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
  comments: Array.isArray(task.comments)
    ? task.comments.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: serializePerson(comment.user)
      }))
    : [],
  activities: Array.isArray(task.activities)
    ? task.activities.map(serializeActivity)
    : undefined,
  commentCount: task._count?.comments ?? task.comments?.length ?? 0,
  attachmentCount: task._count?.attachments ?? 0,
  likeCount: task._count?.likes ?? 0,
  likedByMe: Array.isArray(task.likes) && task.likes.length > 0
})

export const personName = (user: { name?: string | null; email?: string | null }) =>
  user.name || user.email || 'Someone'

export const logTaskActivity = async (input: {
  taskId: string
  userId: string
  type: string
  message: string
  metadata?: Record<string, unknown> | null
}) => {
  await prisma.taskActivity.create({
    data: {
      taskId: input.taskId,
      userId: input.userId,
      type: input.type,
      message: input.message,
      metadata: input.metadata ?? undefined
    }
  })
}

const toDateKey = (value: Date | string | null | undefined) => {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export const formatDateLabel = (value: Date | string | null | undefined) => {
  const key = toDateKey(value)
  if (!key) return null
  const [year, month, day] = key.split('-')
  return `${month}/${day}/${year}`
}

/**
 * Throws a 404 `createError` if `userId` (local User.id) does not have access
 * to `taskId` via workspace membership. Returns the task otherwise.
 */
export const validateTaskAccess = async (taskId: string, userId: string) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        workspace: {
          OR: [
            { createdBy: userId },
            { members: { some: { userId } } }
          ]
        }
      }
    }
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
  return prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      ...taskBoardInclude(userId),
      column: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: assigneeSelect }
        }
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: assigneeSelect }
        }
      }
    }
  })
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

export const dateChangeMessage = (
  field: 'start date' | 'due date' | 'end date',
  previous: Date | string | null | undefined,
  next: Date | string | null | undefined
) => {
  const from = formatDateLabel(previous)
  const to = formatDateLabel(next)
  if (from === to) return null
  if (!from && to) return `set the ${field} to ${to}`
  if (from && !to) return `cleared the ${field}`
  return `changed the ${field} from ${from} to ${to}`
}

/**
 * Moves a task to `columnId` at `index` and rewrites `order` for every task
 * in the affected column(s) so the board order stays consistent.
 */
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
