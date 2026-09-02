export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const columnId = getRouterParam(event, 'columnId') as string

    await validateColumnAccess(columnId, user.id)
    const deleted = await deleteArchivedColumn(columnId)

    return {
      data: { column: deleted },
      message: 'List deleted permanently'
    }
  } catch (error: any) {
    console.error('Failed to delete archived list:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to delete list'
    })
  }
})
