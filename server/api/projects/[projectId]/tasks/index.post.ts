import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string
    const { title, description, columnId } = await readBody(event)

    await validateProjectAccess(projectId, user.id)

    const column = await prisma.taskColumn.findFirst({
      where: { id: columnId, projectId }
    })

    if (!column) {
      throw createError({
        statusCode: 404,
        message: 'Column not found.'
      })
    }

    const lastTask = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { order: 'desc' }
    })

    const created = await prisma.task.create({
      data: {
        title,
        description: description || null,
        columnId,
        projectId,
        createdBy: user.id,
        assigneeId: user.id,
        priority: 'MEDIUM',
        status: 'TODO',
        order: (lastTask?.order ?? -1) + 1,
        members: {
          create: { userId: user.id }
        }
      }
    })

    await logTaskActivity({
      taskId: created.id,
      userId: user.id,
      type: 'CREATED',
      message: 'created this card'
    })

    const task = await prisma.task.findUniqueOrThrow({
      where: { id: created.id },
      include: taskBoardInclude(user.id)
    })

    setResponseStatus(event, 201)
    return {
      data: { task: serializeTask(task) },
      message: 'Task created successfully'
    }
  } catch (error: any) {
    console.error('Failed to create task:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
