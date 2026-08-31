export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const body = await readBody(event).catch(() => ({}))

    await validateWorkspace(workspaceId, user.id)

    const requestUrl = getRequestURL(event)
    const invite = await createWorkspaceInvite({
      workspaceId,
      createdBy: user.id,
      email: typeof body?.email === 'string' ? body.email : null,
      origin: `${requestUrl.protocol}//${requestUrl.host}`
    })

    let emailed = false
    if (invite.email) {
      try {
        const { data } = await sendWorkspaceInviteEmail({
          inviteId: invite.id,
          to: invite.email,
          workspaceName: invite.workspaceName,
          inviterName: user.name || user.email,
          inviteUrl: invite.url,
          expiresAt: invite.expiresAt
        })
        emailed = Boolean(data?.id)
      } catch (networkError) {
        console.error(networkError)
      }
    }

    setResponseStatus(event, 201)
    return {
      data: { invite: { ...invite, emailed } },
      message: emailed ? 'Invite email sent' : 'Invite link created'
    }
  } catch (error: any) {
    console.error('Failed to create workspace invite:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
