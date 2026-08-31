import { createHash, randomBytes } from 'node:crypto'
import prisma from '~/lib/prisma'

const DEFAULT_TTL_MS = 72 * 60 * 60 * 1000

export const hashInviteToken = (token: string) =>
  createHash('sha256').update(token).digest('hex')

export const createWorkspaceInvite = async (input: {
  workspaceId: string
  createdBy: string
  email?: string | null
  origin: string
}) => {
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashInviteToken(token)
  const email = input.email?.trim().toLowerCase() || null
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS)

  if (!email) {
    await prisma.workspaceInvite.updateMany({
      where: {
        workspaceId: input.workspaceId,
        email: null,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      data: { expiresAt: new Date() }
    })
  }

  const [invite, workspace] = await Promise.all([
    prisma.workspaceInvite.create({
      data: {
        workspaceId: input.workspaceId,
        createdBy: input.createdBy,
        email,
        role: 'MEMBER',
        tokenHash,
        expiresAt
      }
    }),
    prisma.workspace.findUnique({
      where: { id: input.workspaceId },
      select: { name: true }
    })
  ])

  const origin = input.origin.replace(/\/$/, '')
  return {
    id: invite.id,
    url: `${origin}/invite/${token}`,
    email: invite.email,
    expiresAt: invite.expiresAt,
    workspaceName: workspace?.name || 'a workspace'
  }
}

export const getInviteByToken = async (token: string) => {
  if (!token) {
    throw createError({ statusCode: 400, message: 'Invite token is required.' })
  }

  const invite = await prisma.workspaceInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: {
      workspace: { select: { id: true, name: true } },
      creator: { select: { id: true, email: true, name: true } }
    }
  })

  if (!invite) {
    throw createError({ statusCode: 404, message: 'Invite not found.' })
  }

  const expired = invite.expiresAt.getTime() <= Date.now()
  const used = !!invite.usedAt

  return {
    invite,
    valid: !expired && !used,
    expired,
    used
  }
}

export const acceptWorkspaceInvite = async (
  token: string,
  user: { id: string; email: string; name?: string | null }
) => {
  const { invite, valid, expired, used } = await getInviteByToken(token)

  if (used) {
    throw createError({ statusCode: 410, message: 'This invite has already been used.' })
  }
  if (expired || !valid) {
    throw createError({ statusCode: 410, message: 'This invite has expired.' })
  }

  if (invite.email && invite.email !== user.email.trim().toLowerCase()) {
    throw createError({
      statusCode: 403,
      message: 'This invite is for a different email address.'
    })
  }

  const { alreadyMember } = await addWorkspaceMember(invite.workspaceId, user.id, invite.role)

  if (invite.email) {
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() }
    })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { activeWorkspaceId: invite.workspaceId }
  })

  return {
    inviteId: invite.id,
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspace.name,
    alreadyMember,
    memberName: user.name?.trim() || user.email,
    memberEmail: user.email,
    inviterName: invite.creator.name?.trim() || invite.creator.email,
    inviterEmail: invite.creator.email,
    inviterId: invite.creator.id
  }
}
