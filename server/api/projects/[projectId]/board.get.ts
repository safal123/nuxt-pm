import prisma from '~/lib/prisma'
import { BOARD_COMPLETED_LIMIT } from '~/utils/board'

export default defineApi({
  handler: async ({ user, event }) => {
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
          where: { archivedAt: null, status: { not: 'DONE' } },
          orderBy: { order: 'asc' },
          include: taskBoardInclude(user.id),
        },
      },
    })

    const columnIds = columns.map((column) => column.id)
    const [completedCounts, completedByColumn] = await Promise.all([
      columnIds.length
        ? prisma.task.groupBy({
            by: ['columnId'],
            where: {
              projectId,
              archivedAt: null,
              status: 'DONE',
              columnId: { in: columnIds },
            },
            _count: { _all: true },
          })
        : Promise.resolve([] as { columnId: string; _count: { _all: number } }[]),
      Promise.all(
        columns.map((column) =>
          prisma.task.findMany({
            where: { columnId: column.id, archivedAt: null, status: 'DONE' },
            orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
            take: BOARD_COMPLETED_LIMIT,
            include: taskBoardInclude(user.id),
          }),
        ),
      ),
    ])

    const countByColumn = new Map(
      completedCounts.map((row) => [row.columnId, row._count._all]),
    )

    const boardTasks = [
      ...columns.flatMap((column) => column.tasks),
      ...completedByColumn.flat(),
    ]
    await mergeTaskAttachmentCounts(boardTasks)

    return {
      data: {
        columns: columns.map((column, index) => ({
          ...column,
          completedCount: countByColumn.get(column.id) ?? 0,
          tasks: [...column.tasks, ...completedByColumn[index]]
            .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
            .map((task) => serializeTask(task, { compact: true })),
        })),
      },
      message: 'Board fetched successfully',
    }
  },
})
