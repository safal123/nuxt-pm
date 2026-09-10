import prisma from '~/lib/prisma'
import { taskCreateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: taskCreateSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)

    const column = await prisma.taskColumn.findFirst({
      where: { id: body.columnId, projectId },
    })

    if (!column) {
      throw createError({
        statusCode: 404,
        message: 'Column not found.',
      })
    }

    const lastTask = await prisma.task.findFirst({
      where: { columnId: body.columnId },
      orderBy: { order: 'desc' },
    })

    const created = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description || null,
        columnId: body.columnId,
        projectId,
        createdBy: user.id,
        assigneeId: user.id,
        priority: 'MEDIUM',
        status: 'TODO',
        order: (lastTask?.order ?? -1) + 1,
        members: {
          create: { userId: user.id },
        },
      },
    })

    await logActivity({
      workspaceId: project.workspaceId,
      projectId,
      taskId: created.id,
      userId: user.id,
      type: 'CREATED',
      message: 'created this card',
    })

    const task = await prisma.task.findUniqueOrThrow({
      where: { id: created.id },
      include: taskBoardInclude(user.id),
    })

    return {
      data: { task: serializeTask(task) },
      message: 'Task created successfully',
      status: 201,
    }
  },
})
