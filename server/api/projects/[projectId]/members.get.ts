export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string

    await validateProjectAccess(projectId, user.id)
    const members = await listProjectMembers(projectId)

    return {
      data: { members },
      message: 'Project members fetched successfully'
    }
  } catch (error: any) {
    console.error('Failed to fetch project members:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
