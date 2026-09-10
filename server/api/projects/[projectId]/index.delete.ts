import prisma from '~/lib/prisma'

export default defineApi({
  handler: async ({ user, event }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)

    if (project.archivedAt) {
      await prisma.project.delete({ where: { id: projectId } })
      return {
        data: { project: { id: projectId } },
        message: 'Project deleted permanently',
      }
    }

    const archived = await prisma.project.update({
      where: { id: projectId },
      data: { archivedAt: new Date() },
    })

    return {
      data: { project: archived },
      message: 'Project archived successfully',
    }
  },
})
