import prisma from '~/lib/prisma'
import { sprintCreateSchema } from '~/server/utils/schemas'
import { sprintTitle } from '~/utils/sprints'

export default defineApi({
  body: sprintCreateSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const project = await validateProjectAccess(projectId, user.id)

    if (body.start) {
      const active = await findActiveSprint(projectId)
      if (active) {
        throw createError({
          statusCode: 400,
          message: 'Complete the current sprint before starting a new one.',
        })
      }
    }

    const plannedStartAt = parseOptionalDay(body.plannedStartAt)
    const plannedEndAt = parseOptionalDay(body.plannedEndAt)
    if (plannedStartAt && plannedEndAt && plannedEndAt < plannedStartAt) {
      throw createError({
        statusCode: 400,
        message: 'Sprint end date must be on or after the start date.',
      })
    }

    const number = await nextProjectSprintNumber(projectId)
    const now = new Date()
    const created = await prisma.sprint.create({
      data: {
        name: body.name || sprintTitle(number),
        number,
        goal: body.goal ?? null,
        plannedStartAt: plannedStartAt ?? null,
        plannedEndAt: plannedEndAt ?? null,
        status: body.start ? 'ACTIVE' : 'PLANNED',
        startedAt: body.start ? now : null,
        projectId,
        workspaceId: project.workspaceId,
        createdBy: user.id,
      },
      include: { _count: { select: { tasks: true } } },
    })

    await logActivity({
      workspaceId: project.workspaceId,
      projectId,
      userId: user.id,
      type: 'SPRINT_CREATED',
      message: `created ${created.name}`,
      metadata: { sprintId: created.id, number },
    })

    if (body.pullBacklog) {
      const pulled = await prisma.task.updateMany({
        where: {
          projectId,
          archivedAt: null,
          sprintId: null,
          status: { not: 'DONE' },
        },
        data: { sprintId: created.id },
      })
      if (pulled.count) {
        await logActivity({
          workspaceId: project.workspaceId,
          projectId,
          userId: user.id,
          type: 'TASK_ADDED_TO_SPRINT',
          message: `moved ${pulled.count} ${pulled.count === 1 ? 'card' : 'cards'} into ${created.name}`,
          metadata: { sprintId: created.id, count: pulled.count },
        })
      }
    }

    if (body.start) {
      await logActivity({
        workspaceId: project.workspaceId,
        projectId,
        userId: user.id,
        type: 'SPRINT_STARTED',
        message: `started ${created.name}`,
        metadata: { sprintId: created.id },
      })
    }

    const sprint = await prisma.sprint.findUniqueOrThrow({
      where: { id: created.id },
      include: { _count: { select: { tasks: true } } },
    })

    return {
      data: { sprint: serializeSprint({ ...sprint, doneCount: 0 }) },
      message: body.start ? 'Sprint started' : 'Sprint created',
      status: 201,
      realtime: boardRealtime(projectId, { type: 'board.refresh' }),
    }
  },
})
