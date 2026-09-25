import { generateTaskSummary } from '~/server/utils/task-summary'
import { serializeTask } from '~/server/utils/task'
import { boardRealtime } from '~/utils/realtime'

export default defineApi({
  handler: async ({ user, event }) => {
    const taskId = getRouterParam(event, 'taskId') as string
    const { task, created } = await generateTaskSummary(
      taskId,
      user.id,
      user.email,
    )

    return {
      data: { task: serializeTask(task), created },
      message: created
        ? 'Summary generated'
        : 'A summary was already generated today.',
      status: created ? 201 : 200,
      realtime: boardRealtime(task.projectId, {
        type: 'task.upsert',
        task: serializeTask(task),
      }),
    }
  },
})
