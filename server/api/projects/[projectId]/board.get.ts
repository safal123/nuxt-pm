import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string

    await validateProjectAccess(projectId, user.id)

    const columnCount = await prisma.taskColumn.count({ where: { projectId } })
    if (columnCount === 0) {
      await createDefaultColumns(projectId)
    }

    const columns = await prisma.taskColumn.findMany({
      where: { projectId, archivedAt: null },
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          where: { archivedAt: null },
          orderBy: { order: 'asc' },
          include: taskBoardInclude(user.id)
        }
      }
    })

    return {
      data: {
        columns: columns.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) => serializeTask(task))
        }))
      },
      message: 'Board fetched successfully'
    }
  } catch (error: any) {
    console.error('Failed to fetch board:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
