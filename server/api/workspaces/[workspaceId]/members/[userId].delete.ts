export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const targetUserId = getRouterParam(event, 'userId') as string

    await validateWorkspace(workspaceId, user.id)
    await removeWorkspaceMember(workspaceId, targetUserId)

    return {
      data: { userId: targetUserId },
      message: 'Member removed from workspace'
    }
  } catch (error: any) {
    console.error('Failed to remove workspace member:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
