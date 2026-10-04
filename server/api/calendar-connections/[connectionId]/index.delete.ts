import {
  deleteCalendarConnection,
  validateCalendarConnectionAccess,
} from '~/server/utils/calendar'

/** Removes the connection and, by cascade, every event it imported. */
export default defineApi({
  handler: async ({ user, event }) => {
    const connectionId = getRouterParam(event, 'connectionId') as string
    const connection = await validateCalendarConnectionAccess(connectionId, user.id)
    await deleteCalendarConnection(connection, user.id)

    return { data: { id: connectionId }, message: 'Calendar disconnected' }
  },
})
