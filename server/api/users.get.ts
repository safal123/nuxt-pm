import prisma from '@/lib/prisma'

export default defineEventHandler (async (event) => {
  try {
    const userId = event.context.auth?.sessionClaims?.sub
    console.log ('userId', userId)
    if (!userId) {
      console.error ('Unauthorized: User ID not found in session claims.')
      throw createError ({
        status: 401,
        message: 'Unauthorized: User ID not found in session claims.'
      })
    }

    const user = await prisma.user.findUnique ({
      where: {
        clerkId: userId
      }
    })

    if (!user) {
      return createError ({
        statusCode: 404,
        statusMessage: 'User not found.'
      })
    }

    // Check if the user already has a workspace
    const existingWorkspace = await prisma.workspace.findFirst ({
      where: {
        members: {
          some: {
            userId: user.id
          }
        }
      }
    })

    console.log ('existingWorkspace', existingWorkspace)

    if (!existingWorkspace) {
      console.log ('Creating workspace for user', user.name)
      await prisma.workspace.create ({
        data: {
          name: `${ user.name }'s Workspace`,
          description: 'My first workspace',
          // @ts-ignore
          createdBy: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER'
            }
          }
        }
      })
    }

    const workspaces = await prisma.workspace.findMany ({
      where: {
        members: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        members: true,
        // @ts-ignore
        projects: true
      }
    })


    return {
      workspaces,
    }
  } catch (error: any) {
    throw createError ({
      statusCode: error.status || 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})