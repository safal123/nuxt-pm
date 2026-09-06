import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string
    const { userId } = await readBody(event)

    await validateProjectAccess(projectId, user.id)

    if (!userId || typeof userId !== 'string') {
      throw createError({ statusCode: 400, message: 'userId is required.' })
    }

    const member = await addProjectMember(projectId, userId)

    if (member.email && member.email !== user.email) {
      try {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: {
            id: true,
            name: true,
            workspaceId: true,
            workspace: { select: { name: true } }
          }
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
              createdBy: user.id
            })
          }
        }
      } catch (networkError) {
        console.error(networkError)
      }
    }

    setResponseStatus(event, 201)
    return {
      data: { member },
      message: 'Member added to project'
    }
  } catch (error: any) {
    console.error('Failed to add project member:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
