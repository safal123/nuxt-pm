export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string
    const { userId } = await readBody(event)

    await validateProjectAccess(projectId, user.id)

    if (!userId || typeof userId !== 'string') {
      throw createError({ statusCode: 400, message: 'userId is required.' })
    }

    const member = await addProjectMember(projectId, userId)
    setResponseStatus(event, 201)
    return {
      data: { member },
      message: 'Member added to project'
    }
  } catch (error: any) {
    console.error('Failed to add project member:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
