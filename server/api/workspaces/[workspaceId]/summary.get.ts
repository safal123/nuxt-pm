import prisma from '~/lib/prisma'
import { serializeFeedActivity } from '~/server/utils/activity'
import { personSelect } from '~/server/utils/person'

export default defineApi({
  handler: async ({ user, event }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    await validateWorkspaceAccess(workspaceId, user.id)

    const liveProject = { workspaceId, archivedAt: null }
    const liveTask = {
      archivedAt: null,
      project: liveProject,
    }

    const [liveProjects, archivedProjects, openTasks, doneTasks, activities] =
      await Promise.all([
        prisma.project.count({ where: liveProject }),
        prisma.project.count({
          where: { workspaceId, archivedAt: { not: null } },
        }),
        prisma.task.count({
          where: { ...liveTask, status: { not: 'DONE' } },
        }),
        prisma.task.count({
          where: { ...liveTask, status: 'DONE' },
        }),
        prisma.activity.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
          take: 12,
          include: {
            user: { select: personSelect },
            task: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
          },
        }),
      ])

    return {
      data: {
        stats: {
          liveProjects,
          archivedProjects,
          openTasks,
          doneTasks,
        },
        activity: activities.map(serializeFeedActivity),
      },
      message: 'Workspace summary fetched',
    }
  },
})
