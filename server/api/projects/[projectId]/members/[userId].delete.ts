export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string
    const targetUserId = getRouterParam(event, 'userId') as string

    await validateProjectAccess(projectId, user.id)
    await removeProjectMember(projectId, targetUserId)

    return {
      data: { userId: targetUserId },
      message: 'Member removed from project'
    }
  } catch (error: any) {
    console.error('Failed to remove project member:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
