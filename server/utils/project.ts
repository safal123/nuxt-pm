import prisma from '~/lib/prisma'
import { workspaceAccessWhere } from '~/server/utils/access'
import { assertCanCreateProject } from '~/server/utils/billing'
import { createDefaultColumns } from '~/server/utils/column'

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
  description?: string | null
  createdBy: string
}) => {
  await assertCanCreateProject(options.workspaceId)
  try {
    const project = await prisma.project.create({
      data: {
        workspaceId: options.workspaceId,
        name: options.name,
        description: options.description || '',
        createdBy: options.createdBy,
        members: {
          create: { userId: options.createdBy, role: 'OWNER' },
        },
      },
    })
    await createDefaultColumns(project.id, project.workspaceId)
    return project
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({
        statusCode: 409,
        message: 'A project with that name already exists in this workspace.',
      })
    }
    throw error
  }
}
