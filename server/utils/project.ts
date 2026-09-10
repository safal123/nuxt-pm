import prisma from '~/lib/prisma'
import { workspaceAccessWhere } from '~/server/utils/access'

/** 404 unless the user can reach this project through the workspace. */
export const validateProjectAccess = async (projectId: string, userId: string) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: workspaceAccessWhere(userId),
    },
  })

  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'Project not found or you do not have access.',
    })
  }

  return project
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
          role: 'OWNER',
        },
      },
    },
  })
}
