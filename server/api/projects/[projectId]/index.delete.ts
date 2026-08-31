import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId')

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          OR: [
            { createdBy: user.id },
            { members: { some: { userId: user.id } } }
          ]
        }
      }
    })

    if (!project) {
      throw createError({
        statusCode: 404,
        message: 'Project not found or you do not have access.'
      })
    }

    await prisma.project.delete({ where: { id: projectId } })

    return {
      data: { project },
      message: 'Project deleted successfully'
    }
  } catch (error: any) {
    console.error('Failed to delete project:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to delete project'
    })
  }
})
