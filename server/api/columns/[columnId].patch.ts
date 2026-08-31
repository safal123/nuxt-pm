export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const columnId = getRouterParam(event, 'columnId') as string
    const body = await readBody(event)

    await validateColumnAccess(columnId, user.id)

    if (typeof body.name === 'string') {
      const column = await renameProjectColumn(columnId, body.name)
      return {
        data: { column },
        message: 'Column renamed successfully'
      }
    }

    if (body.direction === 'left' || body.direction === 'right') {
      const columns = await moveProjectColumn(columnId, body.direction)
      return {
        data: { columns },
        message: 'Column moved successfully'
      }
    }

    if (body.color === null || typeof body.color === 'string') {
      const column = await setColumnColor(columnId, body.color)
      return {
        data: { column },
        message: 'Column color updated successfully'
      }
    }

    if (body.archived === true) {
      const column = await archiveProjectColumn(columnId)
      return {
        data: { column },
        message: 'Column archived successfully'
      }
    }

    throw createError({ statusCode: 400, message: 'Nothing to update.' })
  } catch (error: any) {
    console.error('Failed to update column:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
