import prisma from '~/lib/prisma'

export default defineApi({
  handler: async ({ user, event }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    await validateWorkspaceAccess(workspaceId, user.id)

    const liveProject = { workspaceId, archivedAt: null }

    const [lists, cards, projects] = await Promise.all([
      prisma.taskColumn.findMany({
        where: {
          archivedAt: { not: null },
          project: liveProject,
        },
        orderBy: { archivedAt: 'desc' },
        include: {
          project: { select: { id: true, name: true, createdBy: true } },
          _count: { select: { tasks: true } },
        },
      }),
      prisma.task.findMany({
        where: {
          archivedAt: { not: null },
          column: { archivedAt: null },
          project: liveProject,
        },
        orderBy: { archivedAt: 'desc' },
        include: {
          ...taskBoardInclude(user.id),
          column: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.project.findMany({
        where: { workspaceId, archivedAt: { not: null } },
        orderBy: { archivedAt: 'desc' },
      }),
    ])

    await mergeTaskAttachmentCounts(cards)

    return {
      data: {
        lists: lists.map((list) => ({
          id: list.id,
          name: list.name,
          projectId: list.projectId,
          projectName: list.project.name,
          projectCreatedBy: list.project.createdBy,
          archivedAt: list.archivedAt,
          taskCount: list._count.tasks,
        })),
        cards: cards.map((card) => ({
          ...serializeTask(card),
          projectName: card.project.name,
        })),
        projects,
      },
      message: 'Archive fetched successfully',
    }
  },
})
