import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await validateAndGetUser(event)
    const body = await readBody(event)

    const user = await prisma.user.update({
      where: {
        id: authUser.id
      },
      data: {
        ...body
      }
    })

    return {
      data: { user },
      message: 'User updated successfully'
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Error updating user'
    })
  }
})
