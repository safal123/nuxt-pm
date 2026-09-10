import prisma from '~/lib/prisma'
import { taskCommentSchema } from '~/server/utils/schemas'

export default defineApi({
  body: taskCommentSchema,
  handler: async ({ user, event, body }) => {
    const taskId = getRouterParam(event, 'taskId') as string
    const task = await validateTaskAccess(taskId, user.id)

    await prisma.taskComment.create({
      data: {
        taskId,
        userId: user.id,
        content: body.content,
      },
    })

    await logActivity({
      workspaceId: task.project.workspaceId,
      projectId: task.projectId,
      taskId: task.id,
      userId: user.id,
      type: 'COMMENT',
      message: `${user.name} commented on this card`,
      metadata: { content: body.content },
    })

    const created = await getTaskWithDetails(taskId, user.id)
    return {
      data: { task: serializeTask(created) },
      message: 'Comment added',
      status: 201,
    }
  },
})
