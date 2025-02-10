import { defineEventHandler } from 'h3'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const userId = event.context.auth?.sessionClaims?.sub
    const body = await readBody(event)

    const user = await prisma.user.update({
      where: {
        clerkId: userId
      },
      data: {
        ...body
      }
    })

    return {
      user,
      status: 200,
      message: 'User updated successfully'
    }


  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Error updating user'
    })
  }
})