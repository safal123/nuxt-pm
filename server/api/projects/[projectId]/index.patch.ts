import { updateProject } from '~/server/utils/project'
import { projectUpdateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: projectUpdateSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const existing = await validateProjectAccess(projectId, user.id)
    const project = await updateProject(existing, body, user.id)
    const archived = body.archived === true || body.archived === false

    return {
      data: { project },
      message: archived
        ? body.archived
          ? 'Project archived successfully'
          : 'Project restored successfully'
        : 'Project updated successfully',
    }
  },
})
