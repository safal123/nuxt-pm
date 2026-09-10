import prisma from '~/lib/prisma'
import { projectUpdateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: projectUpdateSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const existing = await validateProjectAccess(projectId, user.id)

    if (body.archived === true || body.archived === false) {
      assertCreator(existing.createdBy, user.id, 'project')
      const project = await prisma.project.update({
        where: { id: projectId },
        data: { archivedAt: body.archived ? new Date() : null },
      })
      return {
        data: { project },
        message: body.archived ? 'Project archived successfully' : 'Project restored successfully',
      }
    }

    const data: { name?: string; description?: string | null } = {}

    if (body.name !== undefined) data.name = body.name
    if (body.description !== undefined) data.description = body.description

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
    })

    return {
      data: { project },
      message: 'Project updated successfully',
    }
  },
})
