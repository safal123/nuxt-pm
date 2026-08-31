export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    await validateWorkspace(workspaceId, user.id)

    const members = await listWorkspaceMembers(workspaceId)

    return {
      data: { members },
      message: 'Workspace members fetched successfully'
    }
  } catch (error: any) {
    console.error('Failed to fetch workspace members:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
