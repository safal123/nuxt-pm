import prisma from '~/lib/prisma'

export default defineApi({
  handler: async ({ user, event }) => {
    const taskId = getRouterParam(event, 'taskId') as string
    const task = await validateTaskAccess(taskId, user.id)

    if (task.archivedAt) {
      await prisma.task.delete({ where: { id: taskId } })
      return {
        data: { task: { id: taskId } },
        message: 'Task deleted permanently',
      }
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { archivedAt: new Date() },
    })

    await logActivity({
      workspaceId: task.project.workspaceId,
      projectId: task.projectId,
      taskId,
      userId: user.id,
      type: 'ARCHIVED',
      message: 'archived this card',
    })

    return {
      data: { task: { id: taskId, archivedAt: new Date() } },
      message: 'Task archived successfully',
    }
  },
})
