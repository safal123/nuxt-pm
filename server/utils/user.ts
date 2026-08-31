import prisma from '~/lib/prisma'
import { H3Event } from 'h3'
import { clerkClient } from '@clerk/nuxt/server'
import type { EmailAddress } from '@clerk/backend'

export const getUserFromClerkId = async (clerkId: string) => {
  return prisma.user.findFirst({
    where: {
      clerkId,
    },
  });
}

/**
 * Fallback for when the Clerk `user.created` webhook hasn't synced this user
 * to our database yet (e.g. webhook not configured/reachable in local dev).
 * Fetches the user directly from Clerk and creates a local record + default
 * workspace, mirroring what the webhook normally does.
 */
const createUserFromClerk = async (event: H3Event, clerkId: string) => {
  const clerkUser = await clerkClient(event).users.getUser(clerkId)

  const email =
    clerkUser.emailAddresses.find((e: EmailAddress) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkId}@example.com`
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email,
      name,
      clerkObject: JSON.parse(JSON.stringify(clerkUser)),
    },
  })

  const existingWorkspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId: user.id } } },
  })

  if (existingWorkspace) {
    return user
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: name ? `${name}'s Workspace` : 'My Workspace',
      description: 'My first workspace',
      createdBy: user.id,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  })

  return prisma.user.update({
    where: { id: user.id },
    data: { activeWorkspaceId: workspace.id },
  })
}

export const validateAndGetUser = async (event: H3Event) => {
  const userId = event.context.auth?.userId
  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  let user = await getUserFromClerkId(userId)

  if (!user) {
    user = await createUserFromClerk(event, userId)
  }

  return user
}