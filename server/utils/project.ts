import prisma from '~/lib/prisma'

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done']

/**
 * Creates the default kanban columns for a newly created project.
 */
export const createDefaultColumns = async (projectId: string) => {
  await prisma.taskColumn.createMany({
    data: DEFAULT_COLUMNS.map((name, order) => ({
      name,
      order,
      projectId
    }))
  })
}

/**
 * Throws a 404 `createError` if `userId` (local User.id) does not have access
 * to `projectId` via workspace membership. Returns the project otherwise.
 */
export const validateProjectAccess = async (projectId: string, userId: string) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: {
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } }
        ]
      }
    }
  })

  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'Project not found or you do not have access.'
    })
  }

  return project
}

export const assertCreator = (createdBy: string, userId: string, noun: string) => {
  if (createdBy !== userId) {
    throw createError({
      statusCode: 403,
      message: `Only the creator can archive or restore this ${noun}.`
    })
  }
}
