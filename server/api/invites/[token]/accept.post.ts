export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const token = getRouterParam(event, 'token') as string

    const result = await acceptWorkspaceInvite(token, {
      id: user.id,
      email: user.email,
      name: user.name
    })

    if (!result.alreadyMember) {
      const requestUrl = getRequestURL(event)
      const dashboardUrl = `${requestUrl.protocol}//${requestUrl.host}/w/${result.workspaceId}/dashboard`

      try {
        await sendWorkspaceWelcomeEmail({
          inviteId: result.inviteId,
          to: result.memberEmail,
          memberName: result.memberName,
          workspaceId: result.workspaceId,
          workspaceName: result.workspaceName,
          dashboardUrl,
          createdBy: user.id
        })

        if (result.inviterId !== user.id && result.inviterEmail !== result.memberEmail) {
          await sendInviteAcceptedNoticeEmail({
            inviteId: result.inviteId,
            to: result.inviterEmail,
            inviterName: result.inviterName,
            memberName: result.memberName,
            memberEmail: result.memberEmail,
            workspaceId: result.workspaceId,
            workspaceName: result.workspaceName,
            dashboardUrl,
            createdBy: user.id
          })
        }
      } catch (networkError) {
        console.error(networkError)
      }
    }

    return {
      data: {
        workspaceId: result.workspaceId,
        workspaceName: result.workspaceName,
        alreadyMember: result.alreadyMember
      },
      message: result.alreadyMember
        ? 'You are already a member of this workspace'
        : 'Joined workspace successfully'
    }
  } catch (error: any) {
    console.error('Failed to accept invite:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
