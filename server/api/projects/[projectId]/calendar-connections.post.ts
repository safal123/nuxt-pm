import { createGoogleCalendarConnection } from '~/server/utils/calendar'
import { calendarConnectionCreateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: calendarConnectionCreateSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)
    const connection = await createGoogleCalendarConnection({
      projectId,
      workspaceId: project.workspaceId,
      userId: user.id,
      calendarId: body.calendarId,
      color: body.color,
    })

    return { data: { connection }, message: 'Google calendar connected', status: 201 }
  },
})
