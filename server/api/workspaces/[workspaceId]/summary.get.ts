import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const workspaceId = getRouterParam(event, 'workspaceId') as string

    await validateWorkspace(workspaceId, user.id)

    const personSelect = {
      id: true,
      name: true,
      email: true,
      clerkObject: true
    } as const

    const liveProject = { workspaceId, archivedAt: null }
    const liveTask = {
      archivedAt: null,
      project: liveProject
    }

    const [liveProjects, archivedProjects, openTasks, doneTasks, activities] =
      await Promise.all([
        prisma.project.count({ where: liveProject }),
        prisma.project.count({
          where: { workspaceId, archivedAt: { not: null } }
        }),
        prisma.task.count({
          where: { ...liveTask, status: { not: 'DONE' } }
        }),
        prisma.task.count({
          where: { ...liveTask, status: 'DONE' }
        }),
        prisma.taskActivity.findMany({
          where: { task: { project: { workspaceId } } },
          orderBy: { createdAt: 'desc' },
          take: 12,
          include: {
            user: { select: personSelect },
            task: {
              select: {
                id: true,
                title: true,
                project: { select: { id: true, name: true } }
              }
            }
          }
        })
      ])

    return {
      data: {
        stats: {
          liveProjects,
          archivedProjects,
          openTasks,
          doneTasks
        },
        activity: activities.map((activity) => ({
          id: activity.id,
          type: activity.type,
          message: activity.message,
          createdAt: activity.createdAt,
          user: serializePerson(activity.user),
          task: { id: activity.task.id, title: activity.task.title },
          project: {
            id: activity.task.project.id,
            name: activity.task.project.name
          }
        }))
      },
      message: 'Workspace summary fetched'
    }
  } catch (error: any) {
    console.error('Failed to fetch workspace summary:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch workspace summary'
    })
  }
})
