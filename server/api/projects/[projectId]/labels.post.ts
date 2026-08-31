import prisma from '~/lib/prisma'

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string
    const { name, color, taskId } = await readBody(event)

    await validateProjectAccess(projectId, user.id)

    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (!trimmed) {
      throw createError({ statusCode: 400, message: 'Label name is required.' })
    }
    if (typeof color !== 'string' || !HEX_COLOR.test(color)) {
      throw createError({ statusCode: 400, message: 'A valid color is required.' })
    }

    const existing = await prisma.label.findFirst({
      where: { projectId, name: trimmed }
    })
    if (existing) {
      throw createError({
        statusCode: 409,
        message: 'A label with that name already exists in this project.'
      })
    }

    const label = await prisma.label.create({
      data: {
        name: trimmed,
        color,
        projectId,
        createdBy: user.id
      }
    })

    if (typeof taskId === 'string' && taskId) {
      const task = await validateTaskAccess(taskId, user.id)
      if (task.projectId !== projectId) {
        throw createError({ statusCode: 400, message: 'Task is not in this project.' })
      }
      await prisma.taskLabel.create({
        data: { taskId, labelId: label.id }
      })
      await logTaskActivity({
        taskId,
        userId: user.id,
        type: 'LABEL_ADDED',
        message: `added the label "${label.name}"`,
        metadata: { labelId: label.id }
      })
    }

    setResponseStatus(event, 201)
    return {
      data: { label: { id: label.id, name: label.name, color: label.color } },
      message: 'Label created successfully'
    }
  } catch (error: any) {
    console.error('Failed to create label:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
