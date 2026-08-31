import prisma from '~/lib/prisma'

export const validateColumnAccess = async (columnId: string, userId: string) => {
  const column = await prisma.taskColumn.findFirst({
    where: {
      id: columnId,
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

  if (!column) {
    throw createError({
      statusCode: 404,
      message: 'Column not found or you do not have access.'
    })
  }

  return column
}

export const createProjectColumn = async (projectId: string, name: string) => {
  const trimmed = name.trim()
  if (!trimmed) {
    throw createError({ statusCode: 400, message: 'Column name is required.' })
  }

  const last = await prisma.taskColumn.findFirst({
    where: { projectId },
    orderBy: { order: 'desc' }
  })

  return prisma.taskColumn.create({
    data: {
      projectId,
      name: trimmed,
      order: (last?.order ?? -1) + 1
    }
  })
}

export const renameProjectColumn = async (columnId: string, name: string) => {
  const trimmed = name.trim()
  if (!trimmed) {
    throw createError({ statusCode: 400, message: 'Column name is required.' })
  }

  return prisma.taskColumn.update({
    where: { id: columnId },
    data: { name: trimmed }
  })
}

export const moveProjectColumn = async (columnId: string, direction: 'left' | 'right') => {
  const column = await prisma.taskColumn.findUnique({ where: { id: columnId } })
  if (!column) {
    throw createError({ statusCode: 404, message: 'Column not found.' })
  }

  const siblings = await prisma.taskColumn.findMany({
    where: { projectId: column.projectId, archivedAt: null },
    orderBy: { order: 'asc' }
  })

  const index = siblings.findIndex((item) => item.id === columnId)
  const target = direction === 'left' ? index - 1 : index + 1
  if (index === -1 || target < 0 || target >= siblings.length) {
    return siblings
  }

  const reordered = [...siblings]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(target, 0, moved)

  await prisma.$transaction(
    reordered.map((item, order) =>
      prisma.taskColumn.update({
        where: { id: item.id },
        data: { order }
      })
    )
  )

  return reordered.map((item, order) => ({ ...item, order }))
}

const COLUMN_COLORS = new Set([
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
  'sky',
  'lime',
  'pink',
  'black'
])

export const setColumnColor = async (columnId: string, color: string | null) => {
  if (color && !COLUMN_COLORS.has(color)) {
    throw createError({ statusCode: 400, message: 'Invalid column color.' })
  }

  return prisma.taskColumn.update({
    where: { id: columnId },
    data: { color }
  })
}

export const archiveProjectColumn = async (columnId: string) => {
  return prisma.taskColumn.update({
    where: { id: columnId },
    data: { archivedAt: new Date() }
  })
}
