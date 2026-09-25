import { canUseAiSummaries } from '~/server/utils/billing'
import {
  listProjectChat,
  listProjectSummaries,
} from '~/server/utils/project-summary'

export default defineApi({
  handler: async ({ user, event }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)
    const [summaries, messages, canUseAi] = await Promise.all([
      listProjectSummaries(projectId),
      listProjectChat(projectId, user.id),
      canUseAiSummaries(project.workspaceId, user.email),
    ])

    return {
      data: { summaries, messages, canUseAi },
      message: 'Project AI fetched',
    }
  },
})
