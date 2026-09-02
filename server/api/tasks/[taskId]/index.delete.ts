import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const taskId = getRouterParam(event, 'taskId') as string
    const task = await validateTaskAccess(taskId, user.id)

    if (task.archivedAt) {
      await prisma.task.delete({ where: { id: taskId } })
      return {
        data: { task: { id: taskId } },
        message: 'Task deleted permanently'
      }
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { archivedAt: new Date() }
    })

    await logTaskActivity({
      taskId,
      userId: user.id,
      type: 'ARCHIVED',
      message: 'archived this card'
    })

    return {
      data: { task: { id: taskId, archivedAt: new Date() } },
      message: 'Task archived successfully'
    }
  } catch (error: any) {
    console.error('Failed to remove task:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to remove task'
    })
  }
})
