import prisma from '~/lib/prisma'
import { isWorkspaceColorId } from '~/utils/task-colors'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const body = await readBody(event).catch(() => ({}))

    const workspace = await validateWorkspace(workspaceId, user.id)

    if (workspace.createdBy !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Only the workspace owner can change these settings.'
      })
    }

    const data: {
      emailOnInvite?: boolean
      emailOnProjectAdd?: boolean
      weekStartsOnMonday?: boolean
      backgroundColor?: string | null
    } = {}

    if (typeof body.emailOnInvite === 'boolean') {
      data.emailOnInvite = body.emailOnInvite
    }
    if (typeof body.emailOnProjectAdd === 'boolean') {
      data.emailOnProjectAdd = body.emailOnProjectAdd
    }
    if (typeof body.weekStartsOnMonday === 'boolean') {
      data.weekStartsOnMonday = body.weekStartsOnMonday
    }
    if (body.backgroundColor === null) {
      data.backgroundColor = null
    } else if (typeof body.backgroundColor === 'string') {
      if (!isWorkspaceColorId(body.backgroundColor)) {
        throw createError({
          statusCode: 400,
          message: 'Pick one of the workspace background colors.'
        })
      }
      data.backgroundColor = body.backgroundColor
    }

    if (!Object.keys(data).length) {
      throw createError({ statusCode: 400, message: 'Nothing to update.' })
    }

    const settings = await prisma.workspaceSetting.upsert({
      where: { workspaceId },
      create: { workspaceId, ...data },
      update: data
    })

    return {
      data: { settings: serializeWorkspaceSettings(settings) },
      message: 'Workspace settings saved'
    }
  } catch (error: any) {
    console.error('Failed to update workspace settings:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
