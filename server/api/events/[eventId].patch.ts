import {
  updateCalendarEvent,
  validateCalendarEventAccess,
} from '~/server/utils/calendar'
import { calendarEventUpdateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: calendarEventUpdateSchema,
  handler: async ({ user, event, body }) => {
    const eventId = getRouterParam(event, 'eventId') as string
    const existing = await validateCalendarEventAccess(eventId, user.id)
    if (existing.provider !== 'LOCAL') {
      throw createError({
        statusCode: 409,
        message: 'Synced events are edited in their own calendar.',
      })
    }
    const calendarEvent = await updateCalendarEvent(existing, body)

    return { data: { event: calendarEvent }, message: 'Event updated' }
  },
})
