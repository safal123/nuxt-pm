import { columnUpdateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: columnUpdateSchema,
  handler: async ({ user, event, body }) => {
    const columnId = getRouterParam(event, 'columnId') as string
    await validateColumnAccess(columnId, user.id)

    if (body.name !== undefined) {
      const column = await renameProjectColumn(columnId, body.name)
      return {
        data: { column },
        message: 'Column renamed successfully',
      }
    }

    if (body.direction) {
      const columns = await moveProjectColumn(columnId, body.direction)
      return {
        data: { columns },
        message: 'Column moved successfully',
      }
    }

    if (body.color !== undefined) {
      const column = await setColumnColor(columnId, body.color)
      return {
        data: { column },
        message: 'Column color updated successfully',
      }
    }

    if (body.archived === true) {
      const column = await archiveProjectColumn(columnId)
      return {
        data: { column },
        message: 'Column archived successfully',
      }
    }

    const column = await restoreProjectColumn(columnId)
    return {
      data: { column },
      message: 'Column restored successfully',
    }
  },
})
