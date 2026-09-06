import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const body = await readBody(event)

    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        description: body.description || null,
        createdBy: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER'
          }
        },
        settings: {
          create: {}
        }
      }
    })

    setResponseStatus(event, 201)
    return {
      data: { workspace },
      message: 'Workspace created successfully'
    }
  } catch (error: any) {
    console.error('Failed to create workspace:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
