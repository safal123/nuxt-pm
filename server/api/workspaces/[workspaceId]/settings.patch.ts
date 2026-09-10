import prisma from '~/lib/prisma'
import { workspaceSettingsSchema } from '~/server/utils/schemas'

export default defineApi({
  body: workspaceSettingsSchema,
  handler: async ({ user, event, body }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const workspace = await validateWorkspaceAccess(workspaceId, user.id)

    if (workspace.createdBy !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Only the workspace owner can change these settings.',
      })
    }

    const data = {
      ...(body.emailOnInvite !== undefined ? { emailOnInvite: body.emailOnInvite } : {}),
      ...(body.emailOnProjectAdd !== undefined ? { emailOnProjectAdd: body.emailOnProjectAdd } : {}),
      ...(body.weekStartsOnMonday !== undefined ? { weekStartsOnMonday: body.weekStartsOnMonday } : {}),
      ...(body.backgroundColor !== undefined ? { backgroundColor: body.backgroundColor } : {}),
    }

    const settings = await prisma.workspaceSetting.upsert({
      where: { workspaceId },
      create: { workspaceId, ...data },
      update: data,
    })

    return {
      data: { settings: serializeWorkspaceSettings(settings) },
      message: 'Workspace settings saved',
    }
  },
})
