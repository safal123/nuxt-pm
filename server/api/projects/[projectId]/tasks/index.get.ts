import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { taskListQuerySchema } from '~/server/utils/schemas'
import { TASK_STATUS_IDS } from '~/utils/task-status'
import { BOARD_COMPLETED_LIMIT } from '~/utils/board'

const parsePositiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(max, Math.floor(parsed))
}

const parseCompletedCursor = (cursor: string) => {
  const sep = cursor.lastIndexOf('::')
  if (sep === -1) return null
  const at = cursor.slice(0, sep)
  const id = cursor.slice(sep + 2)
  if (!id) return null
  const completedAt = at ? new Date(at) : null
  if (completedAt && Number.isNaN(completedAt.getTime())) return null
  return { completedAt, id }
}

export default defineApi({
  query: taskListQuerySchema,
  handler: async ({ user, event, query }) => {
    const projectId = getRouterParam(event, 'projectId') as string
    await validateProjectAccess(projectId, user.id)

    const status = query.status || undefined
    if (status && !TASK_STATUS_IDS.includes(status as (typeof TASK_STATUS_IDS)[number])) {
      throw createError({ statusCode: 400, message: 'Invalid status.' })
    }

    const columnId = query.columnId || undefined
    if (columnId) {
      const column = await prisma.taskColumn.findFirst({
        where: { id: columnId, projectId },
        select: { id: true },
      })
      if (!column) {
        throw createError({ statusCode: 404, message: 'Column not found.' })
      }
    }

    const limit = parsePositiveInt(query.limit, BOARD_COMPLETED_LIMIT, 50)
    const page = parsePositiveInt(query.page, 1, 10_000)
    const cursor = query.cursor ? parseCompletedCursor(query.cursor) : null

    if (query.cursor && !cursor) {
      throw createError({ statusCode: 400, message: 'Invalid cursor.' })
    }

    const where: Prisma.TaskWhereInput = {
      projectId,
      archivedAt: null,
      ...(status ? { status } : {}),
      ...(columnId ? { columnId } : {}),
    }

    const listWhere: Prisma.TaskWhereInput = cursor
      ? {
          ...where,
          AND: [
            cursor.completedAt
              ? {
                  OR: [
                    { completedAt: { lt: cursor.completedAt } },
                    { completedAt: cursor.completedAt, id: { lt: cursor.id } },
                  ],
                }
              : { id: { lt: cursor.id } },
          ],
        }
      : where

    const include = {
      ...taskBoardInclude(user.id),
      column: { select: { name: true } },
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where: listWhere,
        include,
        orderBy: cursor || status === 'DONE'
          ? [{ completedAt: 'desc' }, { id: 'desc' }]
          : [{ createdAt: 'desc' }],
        ...(cursor ? { take: limit } : { skip: (page - 1) * limit, take: limit }),
      }),
    ])

    await mergeTaskAttachmentCounts(tasks)

    return {
      data: {
        tasks: tasks.map((task) => serializeTask(task, { compact: true })),
        total,
        page,
        limit,
        hasMore: cursor ? tasks.length === limit : page * limit < total,
      },
      message: 'Tasks fetched successfully',
    }
  },
})
