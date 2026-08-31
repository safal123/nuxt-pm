import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const taskId = getRouterParam(event, 'taskId') as string
    const { content } = await readBody(event)

    if (!content || typeof content !== 'string' || !content.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Comment cannot be empty.'
      })
    }

    await validateTaskAccess(taskId, user.id)

    await prisma.taskComment.create({
      data: {
        taskId,
        userId: user.id,
        content: content.trim()
      }
    })

    await logTaskActivity({
      taskId,
      userId: user.id,
      type: 'COMMENT',
      message: 'commented',
      metadata: { content: content.trim() }
    })

    const task = await getTaskWithDetails(taskId, user.id)
    setResponseStatus(event, 201)
    return {
      data: { task: serializeTask(task) },
      message: 'Comment added'
    }
  } catch (error: any) {
    console.error('Failed to add comment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
