export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const projectId = getRouterParam(event, 'projectId') as string
    const { name } = await readBody(event)

    await validateProjectAccess(projectId, user.id)
    const column = await createProjectColumn(projectId, name)

    setResponseStatus(event, 201)
    return {
      data: { column: { ...column, tasks: [] } },
      message: 'Column created successfully'
    }
  } catch (error: any) {
    console.error('Failed to create column:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
