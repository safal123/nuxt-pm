import { projectCreateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: projectCreateSchema,
  handler: async ({ user, body }) => {
    await validateWorkspaceAccess(body.workspaceId, user.id)
    const project = await createProject({
      workspaceId: body.workspaceId,
      name: body.name,
      description: body.description || '',
      createdBy: user.id,
    })
    await createDefaultColumns(project.id)

    return {
      data: { project },
      message: 'Project created successfully',
      status: 201,
    }
  },
})
