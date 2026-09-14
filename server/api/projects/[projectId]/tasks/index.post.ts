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

    let sprintId: string | null = null
    if (body.sprintId) {
      const sprint = await validateSprintAccess(body.sprintId, projectId)
      assertSameProject(projectId, [column, sprint])
      if (isClosedSprintStatus(sprint.status)) {
        throw createError({
          statusCode: 400,
          message: 'Cards cannot be added to a completed sprint.',
        })
      }
      sprintId = sprint.id
    } else {
      assertSameProject(projectId, [column])
    }

    const created = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description || null,
        columnId: body.columnId,
        projectId,
        sprintId,
        createdBy: user.id,
        assigneeId: user.id,
        priority: 'MEDIUM',
        status: 'TODO',
        order: await nextOrderInColumnSprint(body.columnId, sprintId),
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
    if (sprintId) {
      await logActivity({
        workspaceId: project.workspaceId,
        projectId,
        taskId: created.id,
        userId: user.id,
        type: 'TASK_ADDED_TO_SPRINT',
        message: 'added this card to the sprint',
        metadata: { sprintId },
      })
    }

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
