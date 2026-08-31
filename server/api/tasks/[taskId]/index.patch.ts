import prisma from '~/lib/prisma'

const parseOptionalDate = (value: unknown) => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const date = new Date(value as string)
  if (Number.isNaN(date.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid date.' })
  }
  return date
}

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const taskId = getRouterParam(event, 'taskId') as string
    const body = await readBody(event)

    await validateTaskAccess(taskId, user.id)

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { column: { select: { id: true, name: true } } }
    })
    if (!existing) {
      throw createError({ statusCode: 404, message: 'Task not found.' })
    }

    if (typeof body.order === 'number' || body.columnId) {
      const nextColumnId = body.columnId ?? existing.columnId
      const nextColumn =
        nextColumnId === existing.columnId
          ? existing.column
          : await prisma.taskColumn.findUnique({
              where: { id: nextColumnId },
              select: { id: true, name: true }
            })

      await moveTaskToIndex(
        taskId,
        nextColumnId,
        typeof body.order === 'number' ? body.order : existing.order
      )

      if (nextColumnId !== existing.columnId && nextColumn) {
        await logTaskActivity({
          taskId,
          userId: user.id,
          type: 'MOVED',
          message: `moved this card from ${existing.column.name} to ${nextColumn.name}`,
          metadata: {
            fromColumnId: existing.columnId,
            toColumnId: nextColumnId
          }
        })
      }
    } else {
      const data: Record<string, unknown> = {}
      if (body.title !== undefined) data.title = body.title
      if (body.description !== undefined) data.description = body.description
      if (body.priority !== undefined) {
        const allowed = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
        if (!allowed.includes(body.priority)) {
          throw createError({ statusCode: 400, message: 'Invalid priority.' })
        }
        data.priority = body.priority
      }
      if (body.completed === true) {
        data.status = 'DONE'
        data.completedAt = existing.completedAt ?? new Date()
      } else if (body.completed === false) {
        data.status = existing.status === 'DONE' ? 'TODO' : existing.status
        data.completedAt = null
      }
      if (body.status !== undefined) {
        const allowed = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']
        if (!allowed.includes(body.status)) {
          throw createError({ statusCode: 400, message: 'Invalid status.' })
        }
        data.status = body.status
        data.completedAt = body.status === 'DONE' ? (existing.completedAt ?? new Date()) : null
      }
      if (body.dueDate !== undefined) data.dueDate = parseOptionalDate(body.dueDate)
      if (body.startDate !== undefined) data.startDate = parseOptionalDate(body.startDate)
      if (body.endDate !== undefined) data.endDate = parseOptionalDate(body.endDate)
      if (body.coverColor !== undefined) data.coverColor = body.coverColor

      if (Object.keys(data).length) {
        await prisma.task.update({
          where: { id: taskId },
          data
        })
      }

      if (typeof body.title === 'string' && body.title !== existing.title) {
        await logTaskActivity({
          taskId,
          userId: user.id,
          type: 'TITLE_CHANGED',
          message: `changed the title to "${body.title}"`,
          metadata: { from: existing.title, to: body.title }
        })
      }

      if (body.description !== undefined) {
        const next = body.description || null
        const previous = existing.description || null
        if (next !== previous) {
          await logTaskActivity({
            taskId,
            userId: user.id,
            type: 'DESCRIPTION_CHANGED',
            message: next ? 'updated the description' : 'cleared the description'
          })
        }
      }

      const dateMessages: string[] = []
      if (body.startDate !== undefined) {
        const message = dateChangeMessage('start date', existing.startDate, data.startDate as Date | null)
        if (message) dateMessages.push(message)
      }
      if (body.dueDate !== undefined) {
        const message = dateChangeMessage('due date', existing.dueDate, data.dueDate as Date | null)
        if (message) dateMessages.push(message)
      }
      if (body.endDate !== undefined) {
        const message = dateChangeMessage('end date', existing.endDate, data.endDate as Date | null)
        if (message) dateMessages.push(message)
      }

      if (dateMessages.length) {
        await logTaskActivity({
          taskId,
          userId: user.id,
          type: 'DATES_UPDATED',
          message: dateMessages.join(', ')
        })
      }

      if (body.coverColor !== undefined && body.coverColor !== existing.coverColor) {
        await logTaskActivity({
          taskId,
          userId: user.id,
          type: 'COVER_CHANGED',
          message: body.coverColor ? 'changed the cover' : 'removed the cover'
        })
      }

      if (
        typeof body.priority === 'string' &&
        body.priority !== existing.priority
      ) {
        await logTaskActivity({
          taskId,
          userId: user.id,
          type: 'PRIORITY_CHANGED',
          message: `changed the priority from ${String(existing.priority).toLowerCase()} to ${body.priority.toLowerCase()}`,
          metadata: { from: existing.priority, to: body.priority }
        })
      }

      const nextStatus = (data.status as string | undefined) ?? existing.status
      if (nextStatus !== existing.status) {
        const fromLabel = String(existing.status).replaceAll('_', ' ').toLowerCase()
        const toLabel = nextStatus.replaceAll('_', ' ').toLowerCase()
        const completed = nextStatus === 'DONE' && existing.status !== 'DONE'
        const reopened = existing.status === 'DONE' && nextStatus !== 'DONE'
        await logTaskActivity({
          taskId,
          userId: user.id,
          type: completed ? 'COMPLETED' : reopened ? 'REOPENED' : 'STATUS_CHANGED',
          message: completed
            ? 'marked this card as complete'
            : reopened
              ? 'reopened this card'
              : `changed the status from ${fromLabel} to ${toLabel}`,
          metadata: { from: existing.status, to: nextStatus }
        })
      }

      if (Array.isArray(body.memberIds)) {
        const members = await syncTaskMembers(taskId, body.memberIds)
        for (const member of members.added) {
          await logTaskActivity({
            taskId,
            userId: user.id,
            type: 'MEMBER_ADDED',
            message: `added ${member.name} to this card`,
            metadata: { memberId: member.id }
          })
        }
        for (const member of members.removed) {
          await logTaskActivity({
            taskId,
            userId: user.id,
            type: 'MEMBER_REMOVED',
            message: `removed ${member.name} from this card`,
            metadata: { memberId: member.id }
          })
        }
      }

      if (Array.isArray(body.labelIds)) {
        const labels = await syncTaskLabels(taskId, existing.projectId, body.labelIds)
        for (const label of labels.added) {
          await logTaskActivity({
            taskId,
            userId: user.id,
            type: 'LABEL_ADDED',
            message: `added the label "${label.name}"`,
            metadata: { labelId: label.id }
          })
        }
        for (const label of labels.removed) {
          await logTaskActivity({
            taskId,
            userId: user.id,
            type: 'LABEL_REMOVED',
            message: `removed the label "${label.name}"`,
            metadata: { labelId: label.id }
          })
        }
      }
    }

    const task = await getTaskWithDetails(taskId, user.id)

    return {
      data: { task: serializeTask(task) },
      message: 'Task updated successfully'
    }
  } catch (error: any) {
    console.error('Failed to update task:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
