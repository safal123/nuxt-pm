import { draftTaskPlan } from '~/server/utils/ai-plan'
import { aiTaskPlanRequestSchema } from '~/server/utils/schemas'

/** Drafts tasks for review. Nothing is saved until /ai-plan/apply. */
export default defineApi({
  body: aiTaskPlanRequestSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)
    await assertCanUseAiSummaries(project.workspaceId, user.email)

    const tasks = await draftTaskPlan({
      projectId,
      columnId: body.columnId,
      goal: body.goal,
    })

    return {
      data: { tasks },
      message: `Drafted ${tasks.length} tasks`,
    }
  },
})
