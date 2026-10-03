import { taskCreateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: taskCreateSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)
    const target = await resolveTaskTarget(projectId, body.columnId, body.sprintId)

    const task = await createColumnTask({
      projectId,
      workspaceId: project.workspaceId,
      columnId: target.column.id,
      sprintId: target.sprintId,
      userId: user.id,
      title: body.title,
      description: body.description,
    })

    return {
      data: { task },
      message: 'Task created successfully',
      status: 201,
      realtime: boardRealtime(projectId, { type: 'task.upsert', task }),
    }
  },
})
