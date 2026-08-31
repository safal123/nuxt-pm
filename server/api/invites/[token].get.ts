export default defineEventHandler(async (event) => {
  try {
    const token = getRouterParam(event, 'token') as string
    const { invite, valid, expired, used } = await getInviteByToken(token)

    return {
      data: {
        workspaceName: invite.workspace.name,
        email: invite.email,
        expiresAt: invite.expiresAt,
        valid,
        expired,
        used
      },
      message: valid ? 'Invite is valid' : 'Invite is not valid'
    }
  } catch (error: any) {
    console.error('Failed to load invite:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
