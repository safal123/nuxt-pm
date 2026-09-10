import prisma from '~/lib/prisma'
import { taskUpdateSchema } from '~/server/utils/schemas'

const parseOptionalDate = (value: unknown) => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const date = new Date(value as string)
  if (Number.isNaN(date.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid date.' })
  }
  return date
}

export default defineApi({
  body: taskUpdateSchema,
  handler: async ({ user, event, body }) => {
    const taskId = getRouterParam(event, 'taskId') as string
    await validateTaskAccess(taskId, user.id)

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: { select: { id: true, name: true } },
        project: { select: { workspaceId: true } },
      },
    })
    if (!existing) {
      throw createError({ statusCode: 404, message: 'Task not found.' })
    }

    const log = (entry: {
      type: string
      message: string
      metadata?: Record<string, unknown> | null
    }) =>
      logActivity({
        workspaceId: existing.project.workspaceId,
        projectId: existing.projectId,
        taskId,
        userId: user.id,
        ...entry,
      })

    if (body.archived === true || body.archived === false) {
      assertCreator(existing.createdBy, user.id, 'card')
      const currentlyArchived = !!existing.archivedAt

      if (body.archived && !currentlyArchived) {
        await prisma.task.update({
          where: { id: taskId },
          data: { archivedAt: new Date() },
        })
        await log({
          type: 'ARCHIVED',
          message: 'archived this card',
        })
      } else if (!body.archived && currentlyArchived) {
        const column = await prisma.taskColumn.findUnique({
          where: { id: existing.columnId },
          select: { id: true, archivedAt: true, projectId: true },
        })
        let columnId = existing.columnId
        if (column?.archivedAt) {
          const fallback = await prisma.taskColumn.findFirst({
            where: { projectId: existing.projectId, archivedAt: null },
            orderBy: { order: 'asc' },
            select: { id: true },
          })
          if (fallback) columnId = fallback.id
        }
        await prisma.task.update({
          where: { id: taskId },
          data: { archivedAt: null, columnId },
        })
        await log({
          type: 'RESTORED',
          message: 'restored this card',
        })
      }

      const task = await getTaskWithDetails(taskId, user.id)
      return {
        data: { task: serializeTask(task) },
        message: body.archived ? 'Task archived successfully' : 'Task restored successfully',
      }
    }

    if (existing.archivedAt) {
      throw createError({
        statusCode: 400,
        message: 'Restore this card before editing.',
      })
    }

    if (typeof body.order === 'number' || body.columnId) {
      const nextColumnId = body.columnId ?? existing.columnId
      const nextColumn =
        nextColumnId === existing.columnId
          ? existing.column
          : await prisma.taskColumn.findUnique({
              where: { id: nextColumnId },
              select: { id: true, name: true },
            })

      await moveTaskToIndex(
        taskId,
        nextColumnId,
        typeof body.order === 'number' ? body.order : existing.order,
      )

      if (nextColumnId !== existing.columnId && nextColumn) {
        await log({
          type: 'MOVED',
          message: `moved this card from ${existing.column.name} to ${nextColumn.name}`,
          metadata: {
            fromColumnId: existing.columnId,
            toColumnId: nextColumnId,
          },
        })
      }
    } else {
      const data: Record<string, unknown> = {}
      if (body.title !== undefined) data.title = body.title
      if (body.description !== undefined) data.description = body.description
      if (body.priority !== undefined) data.priority = body.priority
      if (body.completed === true) {
        data.status = 'DONE'
        data.completedAt = existing.completedAt ?? new Date()
      } else if (body.completed === false) {
        data.status = existing.status === 'DONE' ? 'TODO' : existing.status
        data.completedAt = null
      }
      if (body.status !== undefined) {
        data.status = body.status
        data.completedAt = body.status === 'DONE' ? (existing.completedAt ?? new Date()) : null
      }
      if (body.dueDate !== undefined) data.dueDate = parseOptionalDate(body.dueDate)
      if (body.coverColor !== undefined) data.coverColor = body.coverColor

      if (Object.keys(data).length) {
        await prisma.task.update({
          where: { id: taskId },
          data,
        })
      }

      if (typeof body.title === 'string' && body.title !== existing.title) {
        await log({
          type: 'TITLE_CHANGED',
          message: `changed the title to "${body.title}"`,
          metadata: { from: existing.title, to: body.title },
        })
      }

      if (body.description !== undefined) {
        const next = body.description || null
        const previous = existing.description || null
        if (next !== previous) {
          await log({
            type: 'DESCRIPTION_CHANGED',
            message: next ? 'updated the description' : 'cleared the description',
          })
        }
      }

      const dateChanges = []
      if (body.dueDate !== undefined) {
        const change = dateChangeEntry('due date', existing.dueDate, data.dueDate as Date | null)
        if (change) dateChanges.push(change)
      }

      if (dateChanges.length) {
        await log({
          type: 'DATES_UPDATED',
          message: 'updated the due date',
          metadata: {
            changes: dateChanges.map(({ field, from, to }) => ({ field, from, to })),
          },
        })
      }

      if (body.coverColor !== undefined && body.coverColor !== existing.coverColor) {
        await log({
          type: 'COVER_CHANGED',
          message: body.coverColor ? 'changed the cover' : 'removed the cover',
        })
      }

      if (typeof body.priority === 'string' && body.priority !== existing.priority) {
        await log({
          type: 'PRIORITY_CHANGED',
          message: `changed the priority from ${String(existing.priority).toLowerCase()} to ${body.priority.toLowerCase()}`,
          metadata: { from: existing.priority, to: body.priority },
        })
      }

      const nextStatus = (data.status as string | undefined) ?? existing.status
      if (nextStatus !== existing.status) {
        const fromLabel = String(existing.status).replaceAll('_', ' ').toLowerCase()
        const toLabel = nextStatus.replaceAll('_', ' ').toLowerCase()
        const completed = nextStatus === 'DONE' && existing.status !== 'DONE'
        const reopened = existing.status === 'DONE' && nextStatus !== 'DONE'
        await log({
          type: completed ? 'COMPLETED' : reopened ? 'REOPENED' : 'STATUS_CHANGED',
          message: completed
            ? 'marked this card as complete'
            : reopened
              ? 'reopened this card'
              : `changed the status from ${fromLabel} to ${toLabel}`,
          metadata: { from: existing.status, to: nextStatus },
        })
      }

      if (Array.isArray(body.memberIds)) {
        const members = await syncTaskMembers(taskId, body.memberIds)
        for (const member of members.added) {
          await log({
            type: 'MEMBER_ADDED',
            message: `added ${member.name} to this card`,
            metadata: { memberId: member.id },
          })
        }
        for (const member of members.removed) {
          await log({
            type: 'MEMBER_REMOVED',
            message: `removed ${member.name} from this card`,
            metadata: { memberId: member.id },
          })
        }
      }

      if (Array.isArray(body.labelIds)) {
        const labels = await syncTaskLabels(taskId, existing.projectId, body.labelIds)
        for (const label of labels.added) {
          await log({
            type: 'LABEL_ADDED',
            message: `added the label "${label.name}"`,
            metadata: { labelId: label.id },
          })
        }
        for (const label of labels.removed) {
          await log({
            type: 'LABEL_REMOVED',
            message: `removed the label "${label.name}"`,
            metadata: { labelId: label.id },
          })
        }
      }
    }

    const task = await getTaskWithDetails(taskId, user.id)

    return {
      data: { task: serializeTask(task) },
      message: 'Task updated successfully',
    }
  },
})
