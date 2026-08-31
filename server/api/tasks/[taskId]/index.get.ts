export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const taskId = getRouterParam(event, 'taskId') as string

    await validateTaskAccess(taskId, user.id)
    const task = await getTaskWithDetails(taskId, user.id)

    return {
      data: { task: serializeTask(task) },
      message: 'Task fetched successfully'
    }
  } catch (error: any) {
    console.error('Failed to fetch task:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
