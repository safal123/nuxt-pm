import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    // `validateAndGetUser` guarantees the user exists locally, creating it
    // (and a default workspace) from Clerk data if the webhook hasn't synced yet.
    const user = await validateAndGetUser(event)

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        members: true,
        projects: true
      }
    })

    return {
      data: {
        workspaces,
        user: {
          ...user,
          clerkObject: undefined
        }
      },
      message: 'User fetched successfully'
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
