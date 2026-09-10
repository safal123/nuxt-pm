import prisma from '~/lib/prisma'
import { projectMemberSchema } from '~/server/utils/schemas'

export default defineApi({
  body: projectMemberSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    await validateProjectAccess(projectId, user.id)

    const member = await addProjectMember(projectId, body.userId)

    if (member.email && member.email !== user.email) {
      try {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: {
            id: true,
            name: true,
            workspaceId: true,
            workspace: { select: { name: true } },
          },
        })
        if (project) {
          const settings = await ensureWorkspaceSettings(project.workspaceId)
          if (settings.emailOnProjectAdd) {
            const requestUrl = getRequestURL(event)
            await sendProjectMemberAddedEmail({
              to: member.email,
              memberName: member.name || member.email,
              addedByName: user.name || user.email,
              projectId: project.id,
              projectName: project.name,
              workspaceId: project.workspaceId,
              workspaceName: project.workspace.name,
              dashboardUrl: `${requestUrl.protocol}//${requestUrl.host}/w/${project.workspaceId}/dashboard`,
              createdBy: user.id,
            })
          }
        }
      } catch (networkError) {
        console.error(networkError)
      }
    }

    return {
      data: { member },
      message: 'Member added to project',
      status: 201,
    }
  },
})
