import prisma from '~/lib/prisma'

/**
 * Throws a 404 `createError` if `userId` (local User.id) does not have access to
 * `workspaceId`, either as its creator or as a member.
 */
export const validateWorkspace = async (workspaceId: string, userId: string) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [
        { createdBy: userId },
        { members: { some: { userId } } }
      ]
    }
  })

  if (!workspace) {
    throw createError({
      statusCode: 404,
      message: 'Workspace not found or you do not have access.'
    })
  }

  return workspace
}

export const createProject = async (options: {
  workspaceId: string
  name: string
  description: string
  createdBy: string
}) => {
  return prisma.project.create({
    data: {
      ...options,
      members: {
        create: {
          userId: options.createdBy,
          role: 'OWNER'
        }
      }
    }
  })
}
