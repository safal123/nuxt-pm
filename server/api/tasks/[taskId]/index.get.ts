import { canUseAiSummaries } from '~/server/utils/billing'

export default defineApi({
  handler: async ({ user, event }) => {
    const taskId = getRouterParam(event, 'taskId') as string
    const access = await validateTaskAccess(taskId, user.id)
    const [task, canGenerateSummary] = await Promise.all([
      getTaskWithDetails(taskId, user.id),
      canUseAiSummaries(access.workspaceId, user.email),
    ])

    return {
      data: { task: serializeTask(task), canGenerateSummary },
      message: 'Task fetched successfully',
    }
  },
})
