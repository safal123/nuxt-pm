export default defineApi({
  handler: async ({ user, event }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    await validateProjectAccess(projectId, user.id)
    const members = await listProjectMembers(projectId)

    return {
      data: { members },
      message: 'Project members fetched successfully',
    }
  },
})
