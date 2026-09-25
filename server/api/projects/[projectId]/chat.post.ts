import { chatAboutProject } from '~/server/utils/project-summary'
import { aiChatMessageSchema } from '~/server/utils/schemas'

export default defineApi({
  body: aiChatMessageSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const messages = await chatAboutProject(projectId, user.id, user.email, body.content)

    return {
      data: { messages },
      message: 'Reply generated',
      status: 201,
    }
  },
})
