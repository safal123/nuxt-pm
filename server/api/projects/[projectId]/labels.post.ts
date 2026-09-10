import prisma from '~/lib/prisma'
import { projectLabelCreateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: projectLabelCreateSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    await validateProjectAccess(projectId, user.id)

    const existing = await prisma.label.findFirst({
      where: { projectId, name: body.name },
    })
    if (existing) {
      throw createError({
        statusCode: 409,
        message: 'A label with that name already exists in this project.',
      })
    }

    const label = await prisma.label.create({
      data: {
        name: body.name,
        color: body.color,
        projectId,
        createdBy: user.id,
      },
    })

    if (body.taskId) {
      const task = await validateTaskAccess(body.taskId, user.id)
      if (task.projectId !== projectId) {
        throw createError({ statusCode: 400, message: 'Task is not in this project.' })
      }
      await prisma.taskLabel.create({
        data: { taskId: body.taskId, labelId: label.id },
      })
      await logActivity({
        workspaceId: task.project.workspaceId,
        projectId,
        taskId: body.taskId,
        userId: user.id,
        type: 'LABEL_ADDED',
        message: `added the label "${label.name}"`,
        metadata: { labelId: label.id },
      })
    }

    return {
      data: { label: { id: label.id, name: label.name, color: label.color } },
      message: 'Label created successfully',
      status: 201,
    }
  },
})
