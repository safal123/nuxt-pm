export default defineApi({
  handler: async ({ user, event }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const targetUserId = getRouterParam(event, 'userId') as string

    await validateProjectAccess(projectId, user.id)
    await removeProjectMember(projectId, targetUserId)

    return {
      data: { userId: targetUserId },
      message: 'Member removed from project',
    }
  },
})
