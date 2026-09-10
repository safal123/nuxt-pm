export default defineApi({
  handler: async ({ user, event }) => {
    const taskId = getRouterParam(event, 'taskId') as string
    await validateTaskAccess(taskId, user.id)
    const task = await getTaskWithDetails(taskId, user.id)

    return {
      data: { task: serializeTask(task) },
      message: 'Task fetched successfully',
    }
  },
})
