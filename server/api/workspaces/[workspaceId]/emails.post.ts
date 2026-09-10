import { randomUUID } from 'node:crypto'
import prisma from '~/lib/prisma'
import { workspaceEmailSchema } from '~/server/utils/schemas'

export default defineApi({
  body: workspaceEmailSchema,
  handler: async ({ user, event, body }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    await validateWorkspaceAccess(workspaceId, user.id)

    if (body.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: body.projectId, workspaceId },
        select: { id: true },
      })
      if (!project) {
        throw createError({ statusCode: 404, message: 'Project not found in this workspace.' })
      }
    }

    const { data, error } = await sendCustomEmail({
      to: body.to,
      subject: body.subject,
      kicker: body.kicker,
      title: body.title,
      body: body.body,
      actionLabel: body.actionLabel,
      actionUrl: body.actionUrl,
      workspaceId,
      projectId: body.projectId,
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
  },
})
