import { updateProjectSettings } from '~/server/utils/project'
import { projectSettingsSchema } from '~/server/utils/schemas'

export default defineApi({
  body: projectSettingsSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)
    const settings = await updateProjectSettings(project, body)

    return { data: { settings }, message: 'Project settings saved' }
  },
})
