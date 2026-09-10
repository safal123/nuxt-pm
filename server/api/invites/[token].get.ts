export default defineApi({
  auth: false,
  handler: async ({ event }) => {
    const token = getRouterParam(event, 'token') as string
    const { invite, valid, expired, used } = await getInviteByToken(token)

    return {
      data: {
        workspaceName: invite.workspace.name,
        email: invite.email,
        expiresAt: invite.expiresAt,
        valid,
        expired,
        used,
      },
      message: valid ? 'Invite is valid' : 'Invite is not valid',
    }
  },
})
