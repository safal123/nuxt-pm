import prisma from '~/lib/prisma'

export default defineApi({
  handler: async ({ user, event }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    await validateProjectAccess(projectId, user.id)

    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      orderBy: [{ number: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { tasks: true } },
      },
    })

    const doneCounts = sprints.length
      ? await prisma.task.groupBy({
          by: ['sprintId'],
          where: {
            projectId,
            archivedAt: null,
            status: 'DONE',
            sprintId: { in: sprints.map((sprint) => sprint.id) },
          },
          _count: { _all: true },
        })
      : []

    const doneBySprint = new Map(
      doneCounts.map((row) => [row.sprintId, row._count._all]),
    )

    const data = sprints.map((sprint) =>
      serializeSprint({
        ...sprint,
        doneCount: doneBySprint.get(sprint.id) ?? 0,
      }),
    )

    return {
      data: {
        sprints: data,
        current: data.find((sprint) => sprint.status === 'ACTIVE') ?? null,
      },
      message: 'Sprints fetched successfully',
    }
  },
})
