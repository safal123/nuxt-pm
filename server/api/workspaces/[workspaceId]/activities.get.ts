import prisma from '~/lib/prisma'
import { personSelect, serializePerson } from '~/server/utils/person'
import { serializeFeedActivity } from '~/server/utils/activity'
import { activitiesQuerySchema } from '~/server/utils/schemas'
import { emailTemplateLabel } from '~/utils/email-templates'

export default defineApi({
  query: activitiesQuerySchema,
  handler: async ({ user, event, query }) => {
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const { projectId, taskId, kind } = query

    await validateWorkspaceAccess(workspaceId, user.id)

    const includeEmails = kind !== 'task' && !taskId
    const includeApp = kind !== 'email'

    const [projects, tasks, appActivities, emails] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.task.findMany({
        where: {
          project: { workspaceId },
          ...(projectId ? { projectId } : {}),
        },
        select: { id: true, title: true, projectId: true },
        orderBy: { title: 'asc' },
        take: 300,
      }),
      includeApp
        ? prisma.activity.findMany({
            where: {
              workspaceId,
              ...(projectId ? { projectId } : {}),
              ...(taskId ? { taskId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
            include: {
              user: { select: personSelect },
              task: { select: { id: true, title: true } },
              project: { select: { id: true, name: true } },
            },
          })
        : Promise.resolve([]),
      includeEmails
        ? prisma.emailLog.findMany({
            where: {
              workspaceId,
              createdBy: user.id,
              ...(projectId ? { projectId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
            include: {
              creator: { select: personSelect },
              project: { select: { id: true, name: true } },
            },
          })
        : Promise.resolve([]),
    ])

    const appRows = appActivities.map((activity) => ({
      ...serializeFeedActivity(activity),
      email: null,
    }))

    const emailRows = emails.map((email) => {
      const label = emailTemplateLabel(email.template)
      const sent = email.status === 'sent'
      return {
        id: `email-${email.id}`,
        type: sent ? 'EMAIL_SENT' : 'EMAIL_FAILED',
        message: sent
          ? `sent a ${label.toLowerCase()} email to ${email.toEmail}`
          : `failed to send a ${label.toLowerCase()} email to ${email.toEmail}`,
        metadata: {
          toEmail: email.toEmail,
          subject: email.subject,
          template: email.template,
          status: email.status,
        },
        createdAt: email.createdAt,
        user: email.creator
          ? serializePerson(email.creator)
          : {
              id: 'system',
              name: 'System',
              email: email.fromEmail || '',
              imageUrl: null,
            },
        task: null,
        project: email.project
          ? { id: email.project.id, name: email.project.name }
          : { id: '', name: 'Workspace' },
        email: {
          toEmail: email.toEmail,
          subject: email.subject,
          template: email.template,
          templateLabel: label,
          status: email.status,
          html: email.html,
          error: email.error,
        },
      }
    })

    const activities = [...appRows, ...emailRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    const total = activities.length
    const lastPage = Math.max(1, Math.ceil(total / query.limit) || 1)
    const page = Math.min(query.page, lastPage)
    const start = (page - 1) * query.limit

    return {
      data: {
        projects,
        tasks,
        activities: activities.slice(start, start + query.limit),
        total,
        page,
        limit: query.limit,
      },
      message: 'Activities fetched successfully',
    }
  },
})
