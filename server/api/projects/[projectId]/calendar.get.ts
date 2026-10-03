import { listProjectCalendar } from '~/server/utils/calendar'
import { calendarRangeQuerySchema } from '~/server/utils/schemas'

/** Events and due cards for the visible calendar range. */
export default defineApi({
  query: calendarRangeQuerySchema,
  handler: async ({ user, event, query }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    await validateProjectAccess(projectId, user.id)
    const calendar = await listProjectCalendar(projectId, user.id, query)

    return { data: calendar, message: 'Calendar fetched' }
  },
})
