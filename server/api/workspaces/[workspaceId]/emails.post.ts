import { randomUUID } from 'node:crypto'
import prisma from '~/lib/prisma'

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const body = await readBody(event)

    await validateWorkspace(workspaceId, user.id)

    const to = typeof body?.to === 'string' ? body.to.trim().toLowerCase() : ''
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
    const kicker = typeof body?.kicker === 'string' ? body.kicker.trim() : 'Update'
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const message = typeof body?.body === 'string' ? body.body.trim() : ''
    const actionLabel = typeof body?.actionLabel === 'string' ? body.actionLabel.trim() : ''
    const actionUrl = typeof body?.actionUrl === 'string' ? body.actionUrl.trim() : ''
    const projectId = typeof body?.projectId === 'string' && !['all', 'none', ''].includes(body.projectId)
      ? body.projectId
      : null

    if (!isEmail(to)) {
      throw createError({ statusCode: 400, message: 'Enter a valid email address.' })
    }
    if (!subject) {
      throw createError({ statusCode: 400, message: 'Subject is required.' })
    }
    if (!title) {
      throw createError({ statusCode: 400, message: 'Title is required.' })
    }
    if (!message) {
      throw createError({ statusCode: 400, message: 'Message is required.' })
    }
    if ((actionLabel && !actionUrl) || (!actionLabel && actionUrl)) {
      throw createError({
        statusCode: 400,
        message: 'Button label and URL are both required if you add a button.',
      })
    }
    if (actionUrl && !/^https?:\/\//i.test(actionUrl)) {
      throw createError({
        statusCode: 400,
        message: 'Button URL must start with http:// or https://.',
      })
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId },
        select: { id: true },
      })
      if (!project) {
        throw createError({ statusCode: 404, message: 'Project not found in this workspace.' })
      }
    }

    const { data, error } = await sendCustomEmail({
      to,
      subject,
      kicker,
      title,
      body: message,
      actionLabel: actionLabel || undefined,
      actionUrl: actionUrl || undefined,
      workspaceId,
      projectId,
      createdBy: user.id,
    })

    if (error) {
      throw createError({
        statusCode: 502,
        message: error.message || 'Could not send the email.',
      })
    }

    return {
      data: { id: data?.id ?? randomUUID() },
      message: 'Email sent',
    }
  } catch (error: any) {
    console.error('Failed to send custom email:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to send email',
    })
  }
})
