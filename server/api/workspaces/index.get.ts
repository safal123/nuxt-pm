import prisma from '~/lib/prisma'
import { workspaceAccessWhere } from '~/server/utils/workspace'

export default defineApi({
  handler: async ({ user }) => {
    const workspaces = await prisma.workspace.findMany({
      where: workspaceAccessWhere(user.id),
      include: {
        projects: { include: { settings: true } },
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
          projects: await Promise.all(
            workspace.projects.map(async (project) => {
              const projectSettings = project.settings
                ?? await ensureProjectSettings(project.id, project.workspaceId)
              return serializeProject({ ...project, settings: projectSettings })
            }),
          ),
        }
      }),
    )

    return {
      data: { workspaces: withSettings },
      message: 'Workspaces fetched successfully',
    }
  },
})
