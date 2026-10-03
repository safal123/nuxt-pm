import { aiTaskPlanApplySchema } from '~/server/utils/schemas'

/** Creates the reviewed AI plan as cards, in order, at the end of the list. */
export default defineApi({
  body: aiTaskPlanApplySchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)
    const target = await resolveTaskTarget(projectId, body.columnId, body.sprintId)

    const tasks = []
    for (const draft of body.tasks) {
      tasks.push(
        await createColumnTask({
          projectId,
          workspaceId: project.workspaceId,
          columnId: target.column.id,
          sprintId: target.sprintId,
          userId: user.id,
          title: draft.title,
          description: draft.description,
          priority: draft.priority,
          aiPlanGoal: body.goal,
          activityMessage: 'created this card from an AI plan',
        }),
      )
    }

    return {
      data: { tasks },
      message: `Created ${tasks.length} tasks`,
      status: 201,
      realtime: tasks.map((task) =>
        boardRealtime(projectId, { type: 'task.upsert', task }),
      ),
    }
  },
})
