import { listMemberActivities } from '~/server/utils/activity'
import { memberActivitiesQuerySchema } from '~/server/utils/schemas'

/** Next page of a member's recent activity for the profile page. */
export default defineApi({
  query: memberActivitiesQuerySchema,
  handler: async ({ user, event, query }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const userId = getRouterParam(event, 'userId') as string

    await validateWorkspaceAccess(workspaceId, user.id)
    const page = await listMemberActivities(workspaceId, userId, query.cursor)

    return { data: page, message: 'Member activity fetched' }
  },
})
