export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const { name, description, workspaceId } = await readBody(event)

    await validateWorkspace(workspaceId, user.id)
    const project = await createProject({
      workspaceId,
      name,
      description,
      createdBy: user.id
    })
    await createDefaultColumns(project.id)

    setResponseStatus(event, 201)
    return {
      data: { project },
      message: 'Project created successfully'
    }
  } catch (error: any) {
    console.error('Failed to create project:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create project'
    })
  }
})
