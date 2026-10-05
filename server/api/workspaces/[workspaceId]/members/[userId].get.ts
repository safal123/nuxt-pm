import prisma from '~/lib/prisma'
import { listWorkspaceMembers } from '~/server/utils/member'
import { listMemberActivities } from '~/server/utils/activity'

export default defineApi({
  handler: async ({ user, event }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const userId = getRouterParam(event, 'userId') as string

    await validateWorkspaceAccess(workspaceId, user.id)

    const people = await listWorkspaceMembers(workspaceId)
    const member = people.find((person) => person.id === userId)
    if (!member) {
      throw createError({
        statusCode: 404,
        message: 'That person is not in this workspace.',
      })
    }

    const [membership, workspace, account, projects, assigned, activities] =
      await Promise.all([
        prisma.workspaceMember.findUnique({
          where: { userId_workspaceId: { userId, workspaceId } },
          select: { joinedAt: true },
        }),
        prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { createdAt: true, createdBy: true },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { createdAt: true },
        }),
        prisma.project.findMany({
          where: {
            workspaceId,
            archivedAt: null,
            OR: [
              { createdBy: userId },
              { members: { some: { userId } } },
            ],
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        prisma.task.findMany({
          where: {
            assigneeId: userId,
            archivedAt: null,
            project: { workspaceId, archivedAt: null },
          },
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true,
            project: { select: { name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 12,
        }),
        listMemberActivities(workspaceId, userId),
      ])

    const open = assigned.filter((task) => task.status !== 'DONE').length

    return {
      data: {
        member: {
          ...member,
          joinedAt: membership?.joinedAt ?? workspace?.createdAt ?? null,
          createdAt: account?.createdAt ?? null,
        },
        stats: {
          projects: projects.length,
          assigned: assigned.length,
          open,
          done: assigned.length - open,
        },
        projects,
        tasks: assigned.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          projectId: task.projectId,
          projectName: task.project.name,
        })),
        activities: activities.activities,
        activitiesCursor: activities.nextCursor,
      },
      message: 'Member profile fetched successfully',
    }
  },
})
