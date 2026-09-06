import prisma from '~/lib/prisma'
import { H3Event } from 'h3'
import { clerkClient } from '@clerk/nuxt/server'
import type { EmailAddress, User as ClerkUser } from '@clerk/backend'

export const getUserFromClerkId = async (clerkId: string) => {
  return prisma.user.findUnique({
    where: { clerkId },
  })
}

const fieldsFromClerk = (clerkUser: ClerkUser) => {
  const email =
    clerkUser.emailAddresses.find(
      (item: EmailAddress) => item.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress

  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Clerk user does not have an email address',
    })
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null

  return {
    email,
    name,
    clerkObject: JSON.parse(JSON.stringify(clerkUser)),
  }
}

/** Returns the local user for this Clerk account, creating one if needed. */
export const ensureLocalUserFromClerk = async (
  event: H3Event,
  clerkId: string,
) => {
  const existing = await getUserFromClerkId(clerkId)
  if (existing) return existing

  const clerkUser = await clerkClient(event).users.getUser(clerkId)
  const { email, name, clerkObject } = fieldsFromClerk(clerkUser)

  const byEmail = await prisma.user.findUnique({ where: { email } })
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        clerkId,
        name: name ?? byEmail.name,
        clerkObject,
      },
    })
  }

  return prisma.user.create({
    data: {
      clerkId,
      email,
      name,
      clerkObject,
    },
  })
}

export const validateAndGetUser = async (event: H3Event) => {
  const clerkId = event.context.auth?.userId
  if (!clerkId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  const user = await ensureLocalUserFromClerk(event, clerkId)
  const { user: withWorkspace } = await ensureDefaultWorkspace(user)
  return withWorkspace
}
