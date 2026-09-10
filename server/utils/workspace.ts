import prisma from '~/lib/prisma'
import { workspaceAccessWhere } from '~/server/utils/access'

/** 404 unless the user created this workspace or is a member. */
export const validateWorkspaceAccess = async (workspaceId: string, userId: string) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      ...workspaceAccessWhere(userId),
    },
  })

  if (!workspace) {
    throw createError({
      statusCode: 404,
      message: 'Workspace not found or you do not have access.',
    })
  }

  return workspace
}

export const serializeWorkspaceSettings = (settings: {
  emailOnInvite: boolean
  emailOnProjectAdd: boolean
  weekStartsOnMonday: boolean
  backgroundColor: string | null
}) => ({
  emailOnInvite: settings.emailOnInvite,
  emailOnProjectAdd: settings.emailOnProjectAdd,
  weekStartsOnMonday: settings.weekStartsOnMonday,
  backgroundColor: settings.backgroundColor ?? null,
})

export const ensureWorkspaceSettings = async (workspaceId: string) => {
  return prisma.workspaceSetting.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
  })
}

export const ensureDefaultWorkspace = async (user: {
  id: string
  name: string | null
  activeWorkspaceId: string | null
}) => {
  if (user.activeWorkspaceId) {
    const active = await prisma.workspace.findFirst({
      where: {
        id: user.activeWorkspaceId,
        ...workspaceAccessWhere(user.id),
      },
    })
    if (active) return { user, workspace: active }
  }

  let workspace = await prisma.workspace.findFirst({
    where: workspaceAccessWhere(user.id),
    orderBy: { createdAt: 'asc' },
  })

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: user.name ? `${user.name}'s Workspace` : 'My Workspace',
        description: 'My first workspace',
        createdBy: user.id,
        members: {
          create: { userId: user.id, role: 'OWNER' },
        },
        settings: { create: {} },
      },
    })
  }

  if (user.activeWorkspaceId === workspace.id) {
    return { user, workspace }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { activeWorkspaceId: workspace.id },
  })

  return { user: updated, workspace }
}
