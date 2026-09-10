import prisma from '~/lib/prisma'

export default defineApi({
  handler: async ({ user, event }) => {
    const taskId = getRouterParam(event, 'taskId') as string
    const task = await validateTaskAccess(taskId, user.id)

    const existing = await prisma.taskLike.findUnique({
      where: {
        userId_taskId: { userId: user.id, taskId },
      },
    })

    if (existing) {
      await prisma.taskLike.delete({
        where: { userId_taskId: { userId: user.id, taskId } },
      })
      await logActivity({
        workspaceId: task.project.workspaceId,
        projectId: task.projectId,
        taskId,
        userId: user.id,
        type: 'UNLIKED',
        message: 'unliked this card',
      })
    } else {
      await prisma.taskLike.create({
        data: { userId: user.id, taskId },
      })
      await logActivity({
        workspaceId: task.project.workspaceId,
        projectId: task.projectId,
        taskId,
        userId: user.id,
        type: 'LIKED',
        message: 'liked this card',
      })
    }

    const likeCount = await prisma.taskLike.count({ where: { taskId } })

    return {
      data: {
        liked: !existing,
        likeCount,
      },
      message: existing ? 'Like removed' : 'Task liked',
    }
  },
})
