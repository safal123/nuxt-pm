import { listGoogleCalendars } from '~/server/utils/google-calendar'

export default defineApi({
  handler: async ({ user }) => {
    const calendars = await listGoogleCalendars(user.id)
    return { data: { calendars }, message: 'Google calendars fetched' }
  },
})
