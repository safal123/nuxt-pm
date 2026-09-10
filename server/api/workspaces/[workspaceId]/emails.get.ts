import prisma from '~/lib/prisma'
import { emailsQuerySchema } from '~/server/utils/schemas'
import { EMAIL_TEMPLATES, emailTemplateLabel } from '~/utils/email-templates'

export default defineApi({
  query: emailsQuerySchema,
  handler: async ({ user, event, query }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const { projectId, template, box } = query

    await validateWorkspaceAccess(workspaceId, user.id)

    const [projects, emails] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.emailLog.findMany({
        where: {
          workspaceId,
          ...(box === 'inbox' ? { toEmail: user.email } : { createdBy: user.id }),
          ...(projectId ? { projectId } : {}),
          ...(template ? { template } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          project: { select: { id: true, name: true } },
          creator: { select: { name: true, email: true } },
        },
      }),
    ])

    return {
      data: {
        templates: EMAIL_TEMPLATES,
        projects,
        box,
        emails: emails.map((email) => ({
          id: email.id,
          template: email.template,
          templateLabel: emailTemplateLabel(email.template),
          subject: email.subject,
          toEmail: email.toEmail,
          fromEmail: email.fromEmail,
          fromName: email.creator?.name || email.creator?.email || null,
          html: email.html,
          text: email.text,
          status: email.status,
          error: email.error,
          projectId: email.projectId,
          projectName: email.project?.name ?? null,
          createdAt: email.createdAt,
        })),
      },
      message: 'Emails fetched successfully',
    }
  },
})
