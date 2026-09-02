import prisma from '~/lib/prisma'
import { EMAIL_TEMPLATES, emailTemplateLabel } from '~/utils/email-templates'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const query = getQuery(event)
    const projectId =
      typeof query.projectId === 'string' && query.projectId !== 'all'
        ? query.projectId
        : undefined
    const template =
      typeof query.template === 'string' && query.template !== 'all'
        ? query.template
        : undefined

    await validateWorkspace(workspaceId, user.id)

    const [projects, emails] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
      prisma.emailLog.findMany({
        where: {
          workspaceId,
          createdBy: user.id,
          ...(projectId ? { projectId } : {}),
          ...(template ? { template } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          project: { select: { id: true, name: true } }
        }
      })
    ])

    return {
      data: {
        templates: EMAIL_TEMPLATES,
        projects,
        emails: emails.map((email) => ({
          id: email.id,
          template: email.template,
          templateLabel: emailTemplateLabel(email.template),
          subject: email.subject,
          toEmail: email.toEmail,
          fromEmail: email.fromEmail,
          html: email.html,
          text: email.text,
          status: email.status,
          error: email.error,
          projectId: email.projectId,
          projectName: email.project?.name ?? null,
          createdAt: email.createdAt
        }))
      },
      message: 'Emails fetched successfully'
    }
  } catch (error: any) {
    console.error('Failed to fetch emails:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch emails'
    })
  }
})
