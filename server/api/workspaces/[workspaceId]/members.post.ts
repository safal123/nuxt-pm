import { workspaceMemberSchema } from '~/server/utils/schemas'

export default defineApi({
  body: workspaceMemberSchema,
  handler: async ({ user, event, body }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    await validateWorkspaceAccess(workspaceId, user.id)
    const member = await addWorkspaceMemberByEmail(workspaceId, body.email)

    return {
      data: { member },
      message: 'Member added to workspace',
      status: 201,
    }
  },
})
