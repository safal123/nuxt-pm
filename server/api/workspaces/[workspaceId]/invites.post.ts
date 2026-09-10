import { workspaceInviteSchema } from '~/server/utils/schemas'

export default defineApi({
  body: workspaceInviteSchema,
  handler: async ({ user, event, body }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    await validateWorkspaceAccess(workspaceId, user.id)

    const requestUrl = getRequestURL(event)
    const invite = await createWorkspaceInvite({
      workspaceId,
      createdBy: user.id,
      email: body.email,
      origin: `${requestUrl.protocol}//${requestUrl.host}`,
    })

    let emailed = false
    if (invite.email) {
      const settings = await ensureWorkspaceSettings(workspaceId)
      if (settings.emailOnInvite) {
        try {
          const { data } = await sendWorkspaceInviteEmail({
            inviteId: invite.id,
            to: invite.email,
            workspaceId,
            workspaceName: invite.workspaceName,
            inviterName: user.name || user.email,
            inviteUrl: invite.url,
            expiresAt: invite.expiresAt,
            createdBy: user.id,
          })
          emailed = Boolean(data?.id)
        } catch (networkError) {
          console.error(networkError)
        }
      }
    }

    return {
      data: { invite: { ...invite, emailed } },
      message: emailed ? 'Invite email sent' : 'Invite link created',
      status: 201,
    }
  },
})
