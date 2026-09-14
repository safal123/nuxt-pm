export default defineApi({
  handler: async ({ user, event }) => {
    const columnId = getRouterParam(event, 'columnId') as string
    await validateColumnAccess(columnId, user.id)
    const deleted = await deleteArchivedColumn(columnId)

    return {
      data: { column: deleted },
      message: 'List deleted permanently',
      realtime: boardRealtime(deleted.projectId, { type: 'column.removed', columnId }),
    }
  },
})
