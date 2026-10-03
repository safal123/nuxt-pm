import prisma from '~/lib/prisma'
import { serializeAppUser } from '~/server/utils/person'
import { userUpdateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: userUpdateSchema,
  handler: async ({ user, body }) => {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.activeWorkspaceId !== undefined
          ? { activeWorkspaceId: body.activeWorkspaceId }
          : {}),
        ...(body.activeProjectId !== undefined
          ? { activeProjectId: body.activeProjectId }
          : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.reminderEmails !== undefined
          ? { reminderEmails: body.reminderEmails }
          : {}),
      },
    })

    return {
      data: { user: serializeAppUser(updated) },
      message: 'User updated successfully',
    }
  },
})
