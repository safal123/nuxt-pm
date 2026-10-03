import { createCalendarEvent } from '~/server/utils/calendar'
import { calendarEventCreateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: calendarEventCreateSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)
    const calendarEvent = await createCalendarEvent({
      ...body,
      projectId,
      workspaceId: project.workspaceId,
      userId: user.id,
    })

    return { data: { event: calendarEvent }, message: 'Event created', status: 201 }
  },
})
