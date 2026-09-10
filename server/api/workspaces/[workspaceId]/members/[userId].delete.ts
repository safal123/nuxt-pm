export default defineApi({
  handler: async ({ user, event }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const targetUserId = getRouterParam(event, 'userId') as string

    await validateWorkspaceAccess(workspaceId, user.id)
    await removeWorkspaceMember(workspaceId, targetUserId)

    return {
      data: { userId: targetUserId },
      message: 'Member removed from workspace',
    }
  },
})
