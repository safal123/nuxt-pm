import { clearProjectChat } from '~/server/utils/project-summary'

export default defineApi({
  handler: async ({ user, event }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    await clearProjectChat(projectId, user.id)

    return {
      data: { cleared: true },
      message: 'Chat cleared',
    }
  },
})
