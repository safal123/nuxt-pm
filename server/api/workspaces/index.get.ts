import prisma from '~/lib/prisma'
import { workspaceAccessWhere } from '~/server/utils/access'

export default defineApi({
  handler: async ({ user }) => {
    const workspaces = await prisma.workspace.findMany({
      where: workspaceAccessWhere(user.id),
      include: {
        projects: true,
        members: true,
        settings: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    const withSettings = await Promise.all(
      workspaces.map(async (workspace) => {
        const settings = workspace.settings ?? await ensureWorkspaceSettings(workspace.id)
        return {
          ...workspace,
          settings: serializeWorkspaceSettings(settings),
        }
      }),
    )

    return {
      data: { workspaces: withSettings },
      message: 'Workspaces fetched successfully',
    }
  },
})
