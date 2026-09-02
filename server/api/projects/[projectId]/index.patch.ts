import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string
    const body = await readBody(event)

    const existing = await validateProjectAccess(projectId, user.id)

    if (body.archived === true || body.archived === false) {
      assertCreator(existing.createdBy, user.id, 'project')
      const project = await prisma.project.update({
        where: { id: projectId },
        data: { archivedAt: body.archived ? new Date() : null }
      })
      return {
        data: { project },
        message: body.archived ? 'Project archived successfully' : 'Project restored successfully'
      }
    }

    const data: { name?: string; description?: string | null } = {}

    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (!name) {
        throw createError({ statusCode: 400, message: 'Project name is required.' })
      }
      data.name = name
    }

    if (body.description !== undefined) {
      if (body.description === null || body.description === '') {
        data.description = null
      } else {
        data.description = String(body.description)
      }
    }

    if (!Object.keys(data).length) {
      throw createError({ statusCode: 400, message: 'Nothing to update.' })
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data
    })

    return {
      data: { project },
      message: 'Project updated successfully'
    }
  } catch (error: any) {
    console.error('Failed to update project:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to update project'
    })
  }
})
