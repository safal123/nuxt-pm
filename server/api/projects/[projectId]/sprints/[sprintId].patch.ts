import prisma from '~/lib/prisma'
import { sprintUpdateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: sprintUpdateSchema,
  handler: async ({ user, event, body }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    const sprintId = getRouterParam(event, 'sprintId') as string
    const project = await validateProjectAccess(projectId, user.id)
    const existing = await validateSprintAccess(sprintId, projectId)

    if (body.status === 'ACTIVE') {
      if (isClosedSprintStatus(existing.status)) {
        throw createError({
          statusCode: 400,
          message: 'A completed sprint cannot be reopened.',
        })
      }
      const active = await findActiveSprint(projectId)
      if (active && active.id !== sprintId) {
        throw createError({
          statusCode: 400,
          message: 'Complete the current sprint before starting another.',
        })
      }
    }

    if (body.status === 'COMPLETED' && existing.status === 'COMPLETED') {
      throw createError({
        statusCode: 400,
        message: 'This sprint is already completed.',
      })
    }

    const plannedStartAt =
      body.plannedStartAt !== undefined
        ? parseOptionalDay(body.plannedStartAt)
        : undefined
    const plannedEndAt =
      body.plannedEndAt !== undefined
        ? parseOptionalDay(body.plannedEndAt)
        : undefined
    const nextStart =
      plannedStartAt !== undefined ? plannedStartAt : existing.plannedStartAt
    const nextEnd =
      plannedEndAt !== undefined ? plannedEndAt : existing.plannedEndAt
    if (nextStart && nextEnd && nextEnd < nextStart) {
      throw createError({
        statusCode: 400,
        message: 'Sprint end date must be on or after the start date.',
      })
    }

    const now = new Date()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.goal !== undefined) data.goal = body.goal
    if (plannedStartAt !== undefined) data.plannedStartAt = plannedStartAt
    if (plannedEndAt !== undefined) data.plannedEndAt = plannedEndAt
    if (body.status === 'ACTIVE') {
      data.status = 'ACTIVE'
      data.startedAt = existing.startedAt ?? now
    }
    if (body.status === 'COMPLETED') {
      data.status = 'COMPLETED'
      data.completedAt = existing.completedAt ?? now
      if (!existing.startedAt) data.startedAt = now
    }
    if (body.status === 'CANCELLED') {
      data.status = 'CANCELLED'
    }

    const closing = body.status === 'COMPLETED' || body.status === 'CANCELLED'
    const unfinishedDestination = closing
      ? body.unfinishedDestination || 'backlog'
      : null

    let nextSprintId: string | null = null
    if (unfinishedDestination === 'next') {
      const next = await findOrCreateNextSprint(projectId, existing, user.id)
      nextSprintId = next.sprint.id
      if (next.created) {
        await logActivity({
          workspaceId: project.workspaceId,
          projectId,
          userId: user.id,
          type: 'SPRINT_CREATED',
          message: `created ${next.sprint.name}`,
          metadata: { sprintId: nextSprintId, number: next.sprint.number },
        })
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.sprint.update({
        where: { id: sprintId },
        data,
      })

      if (!unfinishedDestination) return

      await tx.task.updateMany({
        where: {
          sprintId,
          archivedAt: null,
          status: { not: 'DONE' },
        },
        data: { sprintId: nextSprintId },
      })
    })

    if (body.pullBacklog && body.status === 'ACTIVE') {
      const pulled = await prisma.task.updateMany({
        where: {
          projectId,
          archivedAt: null,
          sprintId: null,
          status: { not: 'DONE' },
        },
        data: { sprintId },
      })
      if (pulled.count) {
        await logActivity({
          workspaceId: project.workspaceId,
          projectId,
          userId: user.id,
          type: 'TASK_ADDED_TO_SPRINT',
          message: `moved ${pulled.count} ${pulled.count === 1 ? 'card' : 'cards'} into ${existing.name}`,
          metadata: { sprintId, count: pulled.count },
        })
      }
    }

    if (body.status === 'COMPLETED') {
      await logActivity({
        workspaceId: project.workspaceId,
        projectId,
        userId: user.id,
        type: 'SPRINT_COMPLETED',
        message: `completed ${existing.name}`,
        metadata: {
          sprintId,
          unfinishedDestination,
          nextSprintId,
        },
      })
    } else if (body.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
      await logActivity({
        workspaceId: project.workspaceId,
        projectId,
        userId: user.id,
        type: 'SPRINT_STARTED',
        message: `started ${body.name || existing.name}`,
        metadata: { sprintId },
      })
    }

    const sprint = await prisma.sprint.findUniqueOrThrow({
      where: { id: sprintId },
      include: { _count: { select: { tasks: true } } },
    })
    const doneCount = await prisma.task.count({
      where: { sprintId, archivedAt: null, status: 'DONE' },
    })

    return {
      data: { sprint: serializeSprint({ ...sprint, doneCount }) },
      message:
        body.status === 'COMPLETED'
          ? 'Sprint completed'
          : body.status === 'ACTIVE'
            ? 'Sprint started'
            : 'Sprint updated',
    }
  },
})
