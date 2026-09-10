import prisma from '~/lib/prisma'

const serializeLabel = (label: { id: string; name: string; color: string }) => ({
  id: label.id,
  name: label.name,
  color: label.color,
})

export default defineApi({
  handler: async ({ user, event }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    await validateProjectAccess(projectId, user.id)

    const labels = await prisma.label.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    })

    return {
      data: { labels: labels.map(serializeLabel) },
      message: 'Labels fetched successfully',
    }
  },
})
