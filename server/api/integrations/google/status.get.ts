import { googleCalendarStatus } from '~/server/utils/google-calendar'

/** Whether Google is configured, linked, and has granted calendar access. */
export default defineApi({
  handler: async ({ user }) => {
    const status = await googleCalendarStatus(user.id)
    return { data: { status }, message: 'Google Calendar status fetched' }
  },
})
