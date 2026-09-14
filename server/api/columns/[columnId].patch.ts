import { columnUpdateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: columnUpdateSchema,
  handler: async ({ user, event, body }) => {
    const columnId = getRouterParam(event, 'columnId') as string
    const existing = await validateColumnAccess(columnId, user.id)
    const projectId = existing.projectId

    if (body.name !== undefined) {
      const column = await renameProjectColumn(columnId, body.name)
      return {
        data: { column },
        message: 'Column renamed successfully',
        realtime: boardRealtime(projectId, {
          type: 'column.upsert',
          column: serializeColumn(column),
        }),
      }
    }

    if (body.direction) {
      const columns = await moveProjectColumn(columnId, body.direction)
      return {
        data: { columns },
        message: 'Column moved successfully',
        realtime: boardRealtime(projectId, {
          type: 'column.moved',
          columnIds: columns.map((item) => item.id),
        }),
      }
    }

    if (body.color !== undefined) {
      const column = await setColumnColor(columnId, body.color)
      return {
        data: { column },
        message: 'Column color updated successfully',
        realtime: boardRealtime(projectId, {
          type: 'column.upsert',
          column: serializeColumn(column),
        }),
      }
    }

    if (body.archived === true) {
      const column = await archiveProjectColumn(columnId)
      return {
        data: { column },
        message: 'Column archived successfully',
        realtime: boardRealtime(projectId, { type: 'column.removed', columnId }),
      }
    }

    const column = await restoreProjectColumn(columnId)
    return {
      data: { column },
      message: 'Column restored successfully',
      realtime: boardRealtime(projectId, { type: 'board.refresh' }),
    }
  },
})
