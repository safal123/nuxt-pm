import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { createdBy: user.id },
          {
            members: {
              some: {
                userId: user.id
              }
            }
          }
        ]
      },
      include: {
        projects: true,
        members: true
      }
    })

    return {
      data: { workspaces },
      message: 'Workspaces fetched successfully'
    }
  } catch (error: any) {
    console.error('Failed to fetch workspaces:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
