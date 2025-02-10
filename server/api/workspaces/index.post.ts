import { defineEventHandler } from 'h3'
import { createProject, validateWorkspace } from '@/server/utils/workspace'

export default defineEventHandler(async (event) => {
  try {
    const userId = event.context.auth?.sessionClaims?.sub
    const body = await readBody(event)
    const workspace = await validateWorkspace(body.workspaceId, userId)

    const project = await createProject({
      name: body.name,
      description: body.description,
      workspaceId: body.workspaceId,
      // @ts-ignore
      createdBy: workspace.createdBy
    })

    return {
      project,
      status: 201,
      message: 'Project created successfully'
    }
  } catch (error: any) {
    console.error('Error creating project:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error'
    })
  }
})