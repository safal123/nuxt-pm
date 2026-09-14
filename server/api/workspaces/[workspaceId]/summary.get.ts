import prisma from '~/lib/prisma'
import { serializeFeedActivity } from '~/server/utils/activity'
import { personSelect } from '~/server/utils/person'
import { buildActivitySeries, buildStatusSeries } from '~/utils/analytics'
import { subDays, startOfDay } from 'date-fns'

export default defineApi({
  handler: async ({ user, event }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    await validateWorkspaceAccess(workspaceId, user.id)

    const liveProject = { workspaceId, archivedAt: null }
    const liveTask = {
      archivedAt: null,
      project: liveProject,
    }
    const since = startOfDay(subDays(new Date(), 13))

    const [
      liveProjects,
      archivedProjects,
      openTasks,
      doneTasks,
      activities,
      createdRows,
      completedRows,
      statusGroups,
      projectStatusGroups,
      projects,
    ] = await Promise.all([
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
      prisma.task.findMany({
        where: { ...liveTask, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.task.findMany({
        where: { ...liveTask, completedAt: { gte: since } },
        select: { completedAt: true },
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: liveTask,
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ['projectId', 'status'],
        where: liveTask,
        _count: { _all: true },
      }),
      prisma.project.findMany({
        where: liveProject,
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])

    const workload = new Map<string, { Open: number; Done: number }>()
    for (const row of projectStatusGroups) {
      const current = workload.get(row.projectId) ?? { Open: 0, Done: 0 }
      if (row.status === 'DONE') current.Done += row._count._all
      else current.Open += row._count._all
      workload.set(row.projectId, current)
    }

    const projectWorkload = projects
      .map((project) => {
        const counts = workload.get(project.id) ?? { Open: 0, Done: 0 }
        return {
          project: project.name,
          Open: counts.Open,
          Done: counts.Done,
        }
      })
      .filter((item) => item.Open + item.Done > 0)
      .sort((a, b) => b.Open + b.Done - (a.Open + a.Done))
      .slice(0, 8)

    return {
      data: {
        stats: {
          liveProjects,
          archivedProjects,
          openTasks,
          doneTasks,
        },
        analytics: {
          activity: buildActivitySeries(
            createdRows.map((row) => row.createdAt),
            completedRows.map((row) => row.completedAt),
          ),
          statuses: buildStatusSeries(
            statusGroups.map((row) => ({
              status: row.status,
              count: row._count._all,
            })),
          ),
          projects: projectWorkload,
        },
        activity: activities.map(serializeFeedActivity),
      },
      message: 'Workspace summary fetched',
    }
  },
})
