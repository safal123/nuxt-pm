import { projectColumnCreateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: projectColumnCreateSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)
    const column = await createProjectColumn(projectId, body.name)

    await logActivity({
      workspaceId: project.workspaceId,
      projectId,
      userId: user.id,
      type: 'COLUMN_CREATED',
      message: `created the list "${column.name}"`,
    })

    return {
      data: { column: { ...column, tasks: [], completedCount: 0 } },
      message: 'Column created successfully',
      status: 201,
    }
  },
})
