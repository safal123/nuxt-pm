import prisma from '~/lib/prisma'
import { getUserFromClerkId } from '@/server/utils/user'

/**
 * Validate if the workspace exists and the user has access to it.
 * @param workspaceId - The ID of the workspace.
 * @param userId - The ID of the user.
 * @returns The workspace if valid.
 * @throws Error if the workspace is not found or the user does not have access.
 */
export const validateWorkspace = async (workspaceId: string, userId: string) => {
  try {
    const user = await getUserFromClerkId (userId)
    const workspace = await prisma.workspace.findFirst ({
      where: {
        id: workspaceId,
        members: {
          some: {
            userId: user?.id
          }
        }
      },
    })

    if (!workspace) {
      throw createError ({
        statusCode: 404,
        statusMessage: 'Workspace not found or you do not have access.'
      })
    }

    return workspace
  } catch (error: any) {
    throw createError ({
      statusCode: 500,
      statusMessage: error.message
    })
  }
}

export const createProject = async (options: {
  workspaceId: string;
  name: string;
  description: string;
  createdBy: string;
}) => {
  const { workspaceId, name, description, createdBy } = options
  // @ts-ignore
  return prisma.project.create ({
    data: {
      ...options,
    }
  })
}