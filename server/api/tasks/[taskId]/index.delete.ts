import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const taskId = getRouterParam(event, 'taskId') as string

    const task = await validateTaskAccess(taskId, user.id)
    await prisma.task.delete({ where: { id: taskId } })

    return {
      data: { task },
      message: 'Task deleted successfully'
    }
  } catch (error: any) {
    console.error('Failed to delete task:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
