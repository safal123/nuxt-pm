import prisma from '~/lib/prisma'
import { isSubdomainTaken } from '~/lib/subdomain'
import { serializeAppUser } from '~/server/utils/person'
import { subdomainCheckSchema } from '~/server/utils/schemas'

export default defineApi({
  body: subdomainCheckSchema,
  handler: async ({ user, body }) => {
    if (body.subdomain === user.subdomain) {
      return {
        data: { user: { ...serializeAppUser(user), canChangeSubdomain: true } },
        message: 'Subdomain unchanged',
      }
    }

    await assertCanChangeSubdomain(user.id)

    if (await isSubdomainTaken(body.subdomain, user.id)) {
      throw createError({ statusCode: 409, message: 'That subdomain is already taken.' })
    }

    const updated = await prisma.user
      .update({ where: { id: user.id }, data: { subdomain: body.subdomain } })
      .catch((error: { code?: string }) => {
        if (error?.code === 'P2002') {
          throw createError({ statusCode: 409, message: 'That subdomain is already taken.' })
        }
        throw error
      })

    return {
      data: { user: { ...serializeAppUser(updated), canChangeSubdomain: true } },
      message: 'Workspace address updated',
    }
  },
})
