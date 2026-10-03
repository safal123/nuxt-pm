import prisma from '~/lib/prisma'
import { validateCalendarEventAccess } from '~/server/utils/calendar'

export default defineApi({
  handler: async ({ user, event }) => {
    const eventId = getRouterParam(event, 'eventId') as string
    const existing = await validateCalendarEventAccess(eventId, user.id)
    if (existing.provider !== 'LOCAL') {
      throw createError({
        statusCode: 409,
        message: 'Synced events are removed from their own calendar.',
      })
    }
    await prisma.calendarEvent.delete({ where: { id: eventId } })

    return { data: { event: { id: eventId } }, message: 'Event deleted' }
  },
})
