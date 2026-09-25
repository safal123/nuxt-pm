import {
  generateProjectSummary,
  listProjectSummaries,
} from '~/server/utils/project-summary'

export default defineApi({
  handler: async ({ user, event }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const { created } = await generateProjectSummary(projectId, user.id, user.email)

    return {
      data: { summaries: await listProjectSummaries(projectId), created },
      message: created
        ? 'Summary generated'
        : 'A summary was already generated today.',
      status: created ? 201 : 200,
    }
  },
})
