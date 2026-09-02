import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)

    if (project.archivedAt) {
      await prisma.project.delete({ where: { id: projectId } })
      return {
        data: { project: { id: projectId } },
        message: 'Project deleted permanently'
      }
    }

    const archived = await prisma.project.update({
      where: { id: projectId },
      data: { archivedAt: new Date() }
    })

    return {
      data: { project: archived },
      message: 'Project archived successfully'
    }
  } catch (error: any) {
    console.error('Failed to remove project:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to remove project'
    })
  }
})
