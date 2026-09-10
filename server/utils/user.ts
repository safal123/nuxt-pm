import prisma from '~/lib/prisma'
import type { H3Event } from 'h3'
import { auth } from '~/lib/auth'
import { ensureDefaultWorkspace } from '~/server/utils/workspace'

/**
 * Resolves the signed-in user for a request.
 *
 * Better Auth owns the `users` row, so there is nothing to sync here — but a
 * brand new account still needs a workspace before it can use the app, and that
 * is created lazily on the first authenticated request.
 */
export const validateAndGetUser = async (event: H3Event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    // Session cookie outlived its user row.
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const { user: withWorkspace } = await ensureDefaultWorkspace(user)
  return withWorkspace
}
