import prisma from '~/lib/prisma'
import { emailTemplateLabel } from '~/utils/email-templates'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const workspaceId = getRouterParam(event, 'workspaceId') as string
    const query = getQuery(event)
    const projectId = typeof query.projectId === 'string' && query.projectId !== 'all'
      ? query.projectId
      : undefined
    const taskId = typeof query.taskId === 'string' && query.taskId !== 'all'
      ? query.taskId
      : undefined
    const kind = typeof query.kind === 'string' ? query.kind : 'all'

    await validateWorkspace(workspaceId, user.id)

    const personSelect = {
      id: true,
      name: true,
      email: true,
      clerkObject: true
    } as const

    const includeEmails = kind !== 'task' && !taskId
    const includeTasks = kind !== 'email'

    const [projects, tasks, taskActivities, emails] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
      prisma.task.findMany({
        where: {
          project: { workspaceId },
          ...(projectId ? { projectId } : {})
        },
        select: { id: true, title: true, projectId: true },
        orderBy: { title: 'asc' },
        take: 300
      }),
      includeTasks
        ? prisma.taskActivity.findMany({
            where: {
              task: {
                project: { workspaceId, ...(projectId ? { id: projectId } : {}) },
                ...(taskId ? { id: taskId } : {})
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
              user: { select: personSelect },
              task: {
                select: {
                  id: true,
                  title: true,
                  projectId: true,
                  project: { select: { id: true, name: true } }
                }
              }
            }
          })
        : Promise.resolve([]),
      includeEmails
        ? prisma.emailLog.findMany({
            where: {
              workspaceId,
              createdBy: user.id,
              ...(projectId ? { projectId } : {})
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
              creator: { select: personSelect },
              project: { select: { id: true, name: true } }
            }
          })
        : Promise.resolve([])
    ])

    const taskRows = taskActivities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      metadata: activity.metadata ?? null,
      createdAt: activity.createdAt,
      user: serializePerson(activity.user),
      task: { id: activity.task.id, title: activity.task.title },
      project: {
        id: activity.task.project.id,
        name: activity.task.project.name
      },
      email: null
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
          status: email.status
        },
        createdAt: email.createdAt,
        user: email.creator
          ? serializePerson(email.creator)
          : {
              id: 'system',
              name: 'System',
              email: email.fromEmail || '',
              imageUrl: null
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
          error: email.error
        }
      }
    })

    const activities = [...taskRows, ...emailRows]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 200)

    return {
      data: {
        projects,
        tasks,
        activities
      },
      message: 'Activities fetched successfully'
    }
  } catch (error: any) {
    console.error('Failed to fetch activities:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch activities'
    })
  }
})
