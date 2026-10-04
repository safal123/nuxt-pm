import {
  syncCalendarConnection,
  validateCalendarConnectionAccess,
} from '~/server/utils/calendar'

export default defineApi({
  handler: async ({ user, event }) => {
    const connectionId = getRouterParam(event, 'connectionId') as string
    const existing = await validateCalendarConnectionAccess(connectionId, user.id)
    const connection = await syncCalendarConnection(existing)

    return { data: { connection }, message: 'Calendar synced' }
  },
})
