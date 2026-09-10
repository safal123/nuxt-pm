export default defineApi({
  handler: async ({ user, event }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    await validateWorkspaceAccess(workspaceId, user.id)
    const members = await listWorkspaceMembers(workspaceId)

    return {
      data: { members },
      message: 'Workspace members fetched successfully',
    }
  },
})
