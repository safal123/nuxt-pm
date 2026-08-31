export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const { email } = await readBody(event)

    await validateWorkspace(workspaceId, user.id)

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw createError({ statusCode: 400, message: 'A valid email is required.' })
    }

    const member = await addWorkspaceMemberByEmail(workspaceId, email)
    setResponseStatus(event, 201)
    return {
      data: { member },
      message: 'Member added to workspace'
    }
  } catch (error: any) {
    console.error('Failed to add workspace member:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
