import { Resend } from 'resend'
import { randomUUID } from 'node:crypto'
import prisma from '~/lib/prisma'
import {
  emailCardHtml,
  escapeHtml,
  workspaceInviteHtml,
  customEmailHtml,
  reminderDigestHtml,
  type ReminderDigestRow,
} from '~/utils/email-templates'
import { colorValue } from '~/utils/task-colors'
import { priorityLabel } from '~/utils/task-priority'
import { CALENDAR_DEFAULT_COLOR, CALENDAR_PRIORITY_COLORS } from '~/utils/calendar'

/** Resend's shared sandbox sender — production must set a verified RESEND_FROM. */
const TEST_FROM = 'Northstar <onboarding@resend.dev>'

const resolveFromAddress = () => {
  const configured = process.env.RESEND_FROM?.trim()
  const isPlaceholder =
    !configured || configured.includes('your-verified-domain.com')

  if (process.env.NODE_ENV === 'production') {
    return isPlaceholder ? null : configured
  }

  return isPlaceholder ? TEST_FROM : configured
}

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { resend: null, from: null as string | null }
  }

  return { resend: new Resend(apiKey), from: resolveFromAddress() }
}

type EmailLogInput = {
  workspaceId: string
  projectId?: string | null
  template: string
  createdBy?: string | null
}

export const sendEmail = async (input: {
  to: string | string[]
  subject: string
  html: string
  text: string
  idempotencyKey: string
  tags?: { name: string; value: string }[]
  log?: EmailLogInput
}) => {
  const { resend, from } = getResendClient()
  const intended = (Array.isArray(input.to) ? input.to : [input.to])
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean)

  if (!resend || !from) {
    const error = {
      name: 'MissingConfig',
      message: 'RESEND_API_KEY and RESEND_FROM must be set.',
    }
    await persistEmailLog(input, {
      fromEmail: from || '',
      toEmail: intended.join(', '),
      subject: input.subject,
      html: input.html,
      text: input.text,
      status: 'failed',
      error: error.message,
      resendId: null,
    })
    return { data: null, error }
  }

  const delivered = resolveRecipients(from, {
    to: intended,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  let data = null as { id: string } | null
  let error = null as { name?: string; message: string } | null

  try {
    const result = await resend.emails.send({
      from,
      to: delivered.to,
      subject: delivered.subject,
      html: delivered.html,
      text: delivered.text,
      idempotencyKey: input.idempotencyKey,
      tags: input.tags,
    })
    data = result.data
    error = result.error
  } catch (networkError: any) {
    error = {
      name: 'NetworkError',
      message: networkError?.message || 'Failed to reach Resend.',
    }
  }

  if (error) {
    console.error(error)
  }

  await persistEmailLog(input, {
    fromEmail: from,
    toEmail: intended.join(', '),
    subject: delivered.subject,
    html: delivered.html,
    text: delivered.text,
    status: error ? 'failed' : 'sent',
    error: error?.message ?? null,
    resendId: data?.id ?? null,
  })

  return { data, error }
}

const persistEmailLog = async (
  input: { log?: EmailLogInput },
  record: {
    fromEmail: string
    toEmail: string
    subject: string
    html: string
    text: string
    status: string
    error: string | null
    resendId: string | null
  },
) => {
  if (!input.log) return
  try {
    await prisma.emailLog.create({
      data: {
        workspaceId: input.log.workspaceId,
        projectId: input.log.projectId || null,
        template: input.log.template,
        createdBy: input.log.createdBy || null,
        fromEmail: record.fromEmail,
        toEmail: record.toEmail,
        subject: record.subject,
        html: record.html,
        text: record.text,
        status: record.status,
        error: record.error,
        resendId: record.resendId,
      },
    })
  } catch (error) {
    console.error('Failed to persist email log:', error)
  }
}

const resolveRecipients = (
  from: string,
  input: { to: string[]; subject: string; html: string; text: string },
) => {
  const testInbox = process.env.RESEND_TEST_TO?.trim().toLowerCase()
  const usingTestFrom = from.includes('onboarding@resend.dev')

  if (!usingTestFrom || !testInbox || input.to.includes(testInbox)) {
    return {
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }
  }

  const intendedLabel = input.to.join(', ')
  const note = `Resend test mode: this email was originally addressed to ${intendedLabel}.`

  return {
    to: [testInbox],
    subject: `[Test for ${intendedLabel}] ${input.subject}`,
    html: `<p style="margin:0 0 16px;font-size:13px;color:#71717a;">${escapeHtml(note)}</p>${input.html}`,
    text: `${note}\n\n${input.text}`,
  }
}

export const sendWorkspaceInviteEmail = async (input: {
  inviteId: string
  to: string
  workspaceId: string
  workspaceName: string
  inviterName: string
  inviteUrl: string
  expiresAt: Date
  createdBy?: string | null
}) => {
  const expiresLabel = input.expiresAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const subject = `${input.inviterName} invited you to ${input.workspaceName}`
  const text = [
    `${input.inviterName} invited you to join ${input.workspaceName}.`,
    '',
    `Accept the invite: ${input.inviteUrl}`,
    `This link expires on ${expiresLabel}.`,
  ].join('\n')

  return sendEmail({
    to: [input.to],
    subject,
    html: workspaceInviteHtml({
      workspaceName: input.workspaceName,
      inviterName: input.inviterName,
      inviteUrl: input.inviteUrl,
      expiresLabel,
    }),
    text,
    idempotencyKey: `workspace-invite/${input.inviteId}`,
    tags: [
      { name: 'category', value: 'workspace-invite' },
      { name: 'invite_id', value: input.inviteId },
    ],
    log: {
      workspaceId: input.workspaceId,
      template: 'workspace-invite',
      createdBy: input.createdBy,
    },
  })
}

export const sendWorkspaceWelcomeEmail = async (input: {
  inviteId: string
  to: string
  memberName: string
  workspaceId: string
  workspaceName: string
  dashboardUrl: string
  createdBy?: string | null
}) => {
  const subject = `You joined ${input.workspaceName}`
  const text = [
    `Hi ${input.memberName},`,
    '',
    `You are now a member of ${input.workspaceName}.`,
    `Open the workspace: ${input.dashboardUrl}`,
  ].join('\n')

  return sendEmail({
    to: [input.to],
    subject,
    html: emailCardHtml({
      kicker: 'Welcome',
      title: `You're in ${escapeHtml(input.workspaceName)}`,
      body: 'Your invite was accepted. You can now open boards, tasks, and work with the rest of the team.',
      actionLabel: 'Open workspace',
      actionUrl: input.dashboardUrl,
    }),
    text,
    idempotencyKey: `workspace-invite-accepted/${input.inviteId}/${input.to}`,
    tags: [
      { name: 'category', value: 'invite-accepted' },
      { name: 'invite_id', value: input.inviteId },
    ],
    log: {
      workspaceId: input.workspaceId,
      template: 'invite-accepted',
      createdBy: input.createdBy,
    },
  })
}

export const sendInviteAcceptedNoticeEmail = async (input: {
  inviteId: string
  to: string
  inviterName: string
  memberName: string
  memberEmail: string
  workspaceId: string
  workspaceName: string
  dashboardUrl: string
  createdBy?: string | null
}) => {
  const subject = `${input.memberName} joined ${input.workspaceName}`
  const text = [
    `Hi ${input.inviterName},`,
    '',
    `${input.memberName} (${input.memberEmail}) accepted your invite and joined ${input.workspaceName}.`,
    `Open the workspace: ${input.dashboardUrl}`,
  ].join('\n')

  return sendEmail({
    to: [input.to],
    subject,
    html: emailCardHtml({
      kicker: 'Invite accepted',
      title: `${escapeHtml(input.memberName)} joined ${escapeHtml(input.workspaceName)}`,
      body: `${escapeHtml(input.memberEmail)} accepted your workspace invite and can now see the boards in this workspace.`,
      actionLabel: 'View workspace',
      actionUrl: input.dashboardUrl,
    }),
    text,
    idempotencyKey: `workspace-invite-notice/${input.inviteId}/${input.memberEmail}`,
    tags: [
      { name: 'category', value: 'invite-accepted-notice' },
      { name: 'invite_id', value: input.inviteId },
    ],
    log: {
      workspaceId: input.workspaceId,
      template: 'invite-accepted-notice',
      createdBy: input.createdBy,
    },
  })
}

export const sendProjectMemberAddedEmail = async (input: {
  to: string
  memberName: string
  addedByName: string
  projectId: string
  projectName: string
  workspaceId: string
  workspaceName: string
  dashboardUrl: string
  createdBy?: string | null
}) => {
  const subject = `You've been added to ${input.projectName}`
  const text = [
    `Hi ${input.memberName},`,
    '',
    `${input.addedByName} added you to ${input.projectName} in ${input.workspaceName}.`,
    `Open the project: ${input.dashboardUrl}`,
  ].join('\n')

  return sendEmail({
    to: [input.to],
    subject,
    html: emailCardHtml({
      kicker: 'Project access',
      title: `You've been added to ${escapeHtml(input.projectName)}`,
      body: `${escapeHtml(input.addedByName)} added you to ${escapeHtml(input.projectName)} in ${escapeHtml(input.workspaceName)}. You can now open the board and work on tasks.`,
      actionLabel: 'Open project',
      actionUrl: input.dashboardUrl,
    }),
    text,
    idempotencyKey: `project-member/${input.projectId}/${input.to}`,
    tags: [
      { name: 'category', value: 'project-member' },
      { name: 'project_id', value: input.projectId },
    ],
    log: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      template: 'project-member',
      createdBy: input.createdBy,
    },
  })
}

export const sendCustomEmail = async (input: {
  to: string
  subject: string
  kicker: string
  title: string
  body: string
  actionLabel?: string
  actionUrl?: string
  workspaceId: string
  projectId?: string | null
  createdBy?: string | null
}) => {
  const text = [
    input.title,
    '',
    input.body,
    input.actionLabel && input.actionUrl ? `${input.actionLabel}: ${input.actionUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return sendEmail({
    to: [input.to],
    subject: input.subject,
    html: customEmailHtml({
      kicker: input.kicker,
      title: input.title,
      body: input.body,
      actionLabel: input.actionLabel,
      actionUrl: input.actionUrl,
    }),
    text,
    idempotencyKey: `custom/${randomUUID()}`,
    tags: [
      { name: 'category', value: 'custom' },
      { name: 'workspace_id', value: input.workspaceId },
    ],
    log: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      template: 'custom',
      createdBy: input.createdBy,
    },
  })
}

export type ReminderDigestItem = {
  kind: 'event' | 'task'
  id: string
  title: string
  startAt: Date
  endAt: Date
  allDay: boolean
  location?: string | null
  color?: string | null
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  columnName?: string | null
  projectId: string
  projectName: string
  workspaceId: string
  workspaceName: string
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const sendReminderDigestEmail = async (input: {
  to: string
  name: string | null
  userId: string
  forDate: string
  when: 'today' | 'tomorrow'
  timeZone: string
  items: ReminderDigestItem[]
  origin: string
}) => {
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: input.timeZone,
    hour: 'numeric',
    minute: '2-digit',
  })
  const dayLabel = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${input.forDate}T00:00:00.000Z`))

  const projectUrl = (item: ReminderDigestItem) =>
    `${input.origin}/w/${item.workspaceId}/projects/${item.projectId}`

  const toRow = (item: ReminderDigestItem): ReminderDigestRow =>
    item.kind === 'event'
      ? {
          kind: 'event',
          when: item.allDay
            ? 'All day'
            : `${time.format(item.startAt)} – ${time.format(item.endAt)}`,
          title: item.title,
          meta: [item.projectName, item.location].filter(Boolean).join(' · '),
          url: projectUrl(item),
          accent: colorValue(item.color ?? CALENDAR_DEFAULT_COLOR),
        }
      : {
          kind: 'task',
          when: `Due · ${priorityLabel(item.priority ?? 'MEDIUM')}`,
          title: item.title,
          meta: [item.projectName, item.columnName].filter(Boolean).join(' · '),
          url: projectUrl(item),
          accent: CALENDAR_PRIORITY_COLORS[item.priority ?? 'MEDIUM'],
        }

  const events = input.items.filter((item) => item.kind === 'event').map(toRow)
  const tasks = input.items.filter((item) => item.kind === 'task').map(toRow)
  const counts = [
    events.length ? plural(events.length, 'event') : '',
    tasks.length ? `${plural(tasks.length, 'card')} due` : '',
  ]
    .filter(Boolean)
    .join(', ')
  const heading = input.when === 'tomorrow' ? 'Tomorrow' : 'Today'
  const subject = `${heading}: ${counts}`
  const greeting = `Hi ${input.name || 'there'},`
  const summary = `Here's what's coming up on ${dayLabel}.`
  const first = input.items[0]
  const settingsUrl = `${input.origin}/w/${first.workspaceId}/settings`

  const text = [
    greeting,
    '',
    summary,
    ...(events.length ? ['', 'Events:', ...events.map((row) => `- ${row.when}  ${row.title} (${row.meta})`)] : []),
    ...(tasks.length ? ['', 'Cards due:', ...tasks.map((row) => `- ${row.title} (${row.meta})`)] : []),
    '',
    `Open: ${projectUrl(first)}`,
    `Turn off reminder emails: ${settingsUrl}`,
  ].join('\n')

  return sendEmail({
    to: [input.to],
    subject,
    html: reminderDigestHtml({
      greeting,
      title: subject,
      summary,
      events,
      tasks,
      actionUrl: projectUrl(first),
      settingsUrl,
    }),
    text,
    idempotencyKey: `reminder-digest/${input.userId}/${input.forDate}`,
    tags: [{ name: 'category', value: 'reminder-digest' }],
    log: {
      workspaceId: first.workspaceId,
      projectId: first.projectId,
      template: 'reminder-digest',
    },
  })
}
