import prisma from '~/lib/prisma'
import { getUserFromClerkId } from '@/server/utils/user'

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
  try {
    // @ts-ignore
    return prisma.project.create ({
      data: {
        ...options,
      }
    })
  } catch (error: any) {
    throw createError ({
      statusCode: 500,
      statusMessage: error.message || 'Cannot create project.'
    })
  }
}