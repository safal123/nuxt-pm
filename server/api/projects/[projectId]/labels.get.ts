import prisma from '~/lib/prisma'

const serializeLabel = (label: { id: string; name: string; color: string }) => ({
  id: label.id,
  name: label.name,
  color: label.color
})

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string

    await validateProjectAccess(projectId, user.id)

    const labels = await prisma.label.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    })

    return {
      data: { labels: labels.map(serializeLabel) },
      message: 'Labels fetched successfully'
    }
  } catch (error: any) {
    console.error('Failed to fetch labels:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
