export const EMAIL_TEMPLATES = [
  {
    id: 'workspace-invite',
    label: 'Workspace invite',
    description: 'Sent when someone is invited to the workspace by email.',
  },
  {
    id: 'invite-accepted',
    label: 'Welcome',
    description: 'Sent to a new member after they accept an invite.',
  },
  {
    id: 'invite-accepted-notice',
    label: 'Invite accepted',
    description: 'Sent to the inviter when their invite is accepted.',
  },
  {
    id: 'project-member',
    label: 'Added to project',
    description: 'Sent when someone is added to a project.',
  },
  {
    id: 'reminder-digest',
    label: 'Daily reminder',
    description: 'Sent once a day with upcoming events and cards due.',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'A branded message you write and send from Emails.',
  },
] as const

export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[number]['id']

export const emailTemplateLabel = (id: string) =>
  EMAIL_TEMPLATES.find((item) => item.id === id)?.label ?? id.replace(/-/g, ' ')

export const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

export type EmailChrome = {
  workspaceName?: string
  footerNoteHtml?: string
  maxWidth?: number
}

const EMAIL_FONT =
  '"DM Sans",ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif'
const EMAIL_INK = '#18181b'

export const emailFooterText = (chrome?: EmailChrome) => {
  const year = new Date().getFullYear()
  const sentFor = chrome?.workspaceName
    ? `Sent for ${chrome.workspaceName}. `
    : ''
  return `${sentFor}© ${year} Northstar. All rights reserved.`
}

export const emailFooterHtml = (chrome?: EmailChrome) => {
  const year = new Date().getFullYear()
  const sentFor = chrome?.workspaceName
    ? `Sent for ${escapeHtml(chrome.workspaceName)} · `
    : ''
  return `
    <div style="padding:24px 8px 0;text-align:center;">
      <p style="margin:0;font-size:13px;font-weight:600;color:${EMAIL_INK};">Northstar</p>
      <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Boards, activity, and email.</p>
      <p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#a1a1aa;">
        ${sentFor}© ${year} Northstar. All rights reserved.
      </p>
      ${
        chrome?.footerNoteHtml
          ? `<p style="margin:8px 0 0;font-size:11px;line-height:1.6;color:#a1a1aa;">${chrome.footerNoteHtml}</p>`
          : ''
      }
    </div>
  `
}

const emailFrame = (inner: string, chrome?: EmailChrome) => `
  <div style="background:#f4f4f5;padding:32px 16px;font-family:${EMAIL_FONT};">
    <div style="max-width:${chrome?.maxWidth ?? 520}px;margin:0 auto;">
      <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e4e4e7;">
        ${inner}
      </div>
      ${emailFooterHtml(chrome)}
    </div>
  </div>
`

const emailButton = (label: string, url: string) => `
  <a href="${escapeHtml(url)}" style="display:inline-block;background:${EMAIL_INK};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:10px;">
    ${escapeHtml(label)}
  </a>
`

export const emailCardHtml = (input: {
  kicker: string
  title: string
  body: string
  actionLabel: string
  actionUrl: string
  workspaceName?: string
}) =>
  emailFrame(
    `
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_INK};font-weight:600;">${escapeHtml(input.kicker)}</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${EMAIL_INK};">${input.title}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">${input.body}</p>
      ${emailButton(input.actionLabel, input.actionUrl)}
    `,
    { workspaceName: input.workspaceName },
  )

export const workspaceInviteHtml = (input: {
  workspaceName: string
  inviterName: string
  inviteUrl: string
  expiresLabel: string
}) =>
  emailFrame(
    `
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_INK};font-weight:600;">Workspace invite</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${EMAIL_INK};">Join ${escapeHtml(input.workspaceName)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
        ${escapeHtml(input.inviterName)} invited you to collaborate on
        <strong>${escapeHtml(input.workspaceName)}</strong>.
      </p>
      ${emailButton('Accept invite', input.inviteUrl)}
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#71717a;">
        This link expires on ${escapeHtml(input.expiresLabel)}. If the button does not work, paste this URL into your browser:
      </p>
      <p style="margin:8px 0 0;font-size:12px;word-break:break-all;color:#52525b;">
        ${escapeHtml(input.inviteUrl)}
      </p>
    `,
    { workspaceName: input.workspaceName },
  )

export const sampleEmailHtml = (id: EmailTemplateId) => {
  if (id === 'workspace-invite') {
    return workspaceInviteHtml({
      workspaceName: 'Northstar',
      inviterName: 'Alex Rivera',
      inviteUrl: 'https://example.com/invite/preview',
      expiresLabel: 'Jan 15, 2027',
    })
  }
  if (id === 'invite-accepted') {
    return emailCardHtml({
      kicker: 'Welcome',
      title: "You're in Northstar",
      body: 'Your invite was accepted. You can now open boards, tasks, and work with the rest of the team.',
      actionLabel: 'Open workspace',
      actionUrl: 'https://example.com/dashboard',
      workspaceName: 'Northstar',
    })
  }
  if (id === 'invite-accepted-notice') {
    return emailCardHtml({
      kicker: 'Invite accepted',
      title: 'Jordan Lee joined Northstar',
      body: 'jordan@example.com accepted your workspace invite and can now see the boards in this workspace.',
      actionLabel: 'View workspace',
      actionUrl: 'https://example.com/dashboard',
      workspaceName: 'Northstar',
    })
  }
  if (id === 'reminder-digest') {
    return reminderDigestHtml({
      greeting: 'Hi Jordan,',
      title: 'Tomorrow: 1 event, 2 cards due',
      summary: "Here's what's coming up on Monday, 5 October.",
      events: [
        { kind: 'event', when: '10:00 AM – 11:00 AM', title: 'Sprint review', meta: 'Website launch · Zoom', url: 'https://example.com', accent: '#c377e0' },
      ],
      tasks: [
        { kind: 'task', when: 'Due · Urgent', title: 'Ship pricing page', meta: 'Website launch · In Progress', url: 'https://example.com', accent: '#ef4444' },
        { kind: 'task', when: 'Due · Medium', title: 'Write FAQ copy', meta: 'Website launch · To Do', url: 'https://example.com', accent: '#14b8a6' },
      ],
      actionUrl: 'https://example.com/dashboard',
      settingsUrl: 'https://example.com/settings',
      workspaceName: 'Northstar',
    })
  }
  if (id === 'custom') {
    return customEmailHtml({
      kicker: 'Update',
      title: 'Sprint wrap-up',
      body: 'The board is up to date. Please review open cards before Friday.',
      actionLabel: 'Open workspace',
      actionUrl: 'https://example.com/dashboard',
      workspaceName: 'Northstar',
    })
  }
  return emailCardHtml({
    kicker: 'Project access',
    title: "You've been added to Website launch",
    body: 'Alex Rivera added you to Website launch in Northstar. You can now open the board and work on tasks.',
    actionLabel: 'Open project',
    actionUrl: 'https://example.com/dashboard',
    workspaceName: 'Northstar',
  })
}

export const customEmailHtml = (input: {
  kicker: string
  title: string
  body: string
  actionLabel?: string
  actionUrl?: string
  workspaceName?: string
}) => {
  const body = escapeHtml(input.body).replaceAll('\n', '<br>')
  const title = escapeHtml(input.title)
  const kicker = input.kicker.trim() || 'Message'
  const actionLabel = input.actionLabel?.trim()
  const actionUrl = input.actionUrl?.trim()

  return emailFrame(
    `
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_INK};font-weight:600;">${escapeHtml(kicker)}</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${EMAIL_INK};">${title}</h1>
      <p style="margin:0${actionLabel && actionUrl ? ' 0 24px' : ''};font-size:15px;line-height:1.6;color:#3f3f46;">${body}</p>
      ${actionLabel && actionUrl ? emailButton(actionLabel, actionUrl) : ''}
    `,
    { workspaceName: input.workspaceName },
  )
}

export const customEmailStarters = (input: {
  workspaceName: string
  projectName?: string | null
  senderName: string
  dashboardUrl: string
}) => ({
  custom: {
    kicker: 'Update',
    title: '',
    body: '',
    actionLabel: '',
    actionUrl: '',
  },
  welcome: {
    kicker: 'Welcome',
    title: `You're in ${input.workspaceName}`,
    body: 'You can now open boards, tasks, and work with the rest of the team.',
    actionLabel: 'Open workspace',
    actionUrl: input.dashboardUrl,
  },
  project: {
    kicker: 'Project access',
    title: input.projectName
      ? `An update on ${input.projectName}`
      : `An update from ${input.workspaceName}`,
    body: `${input.senderName} sent you a project update. Open the board to see the latest work.`,
    actionLabel: 'Open project',
    actionUrl: input.dashboardUrl,
  },
  notice: {
    kicker: 'Notice',
    title: `A note from ${input.workspaceName}`,
    body: `${input.senderName} wanted you to see this update.`,
    actionLabel: 'View workspace',
    actionUrl: input.dashboardUrl,
  },
})

export type ReminderDigestRow = {
  kind: 'event' | 'task'
  when: string
  title: string
  meta: string
  url: string
  accent: string
}

const reminderSection = (heading: string, rows: ReminderDigestRow[]) =>
  rows.length
    ? `
      <p style="margin:24px 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;font-weight:600;">${escapeHtml(heading)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 8px;">
        ${rows
          .map(
            (row) => `
          <tr>
            <td style="width:4px;background:${escapeHtml(row.accent)};border-radius:4px;"></td>
            <td style="padding:10px 12px;background:#fafafa;border:1px solid #f4f4f5;border-left:0;border-radius:0 10px 10px 0;">
              <a href="${escapeHtml(row.url)}" style="text-decoration:none;color:#18181b;">
                <span style="display:block;font-size:12px;font-weight:600;color:#52525b;">${escapeHtml(row.when)}</span>
                <span style="display:block;margin-top:2px;font-size:15px;font-weight:600;line-height:1.4;">${escapeHtml(row.title)}</span>
                <span style="display:block;margin-top:2px;font-size:13px;color:#71717a;">${escapeHtml(row.meta)}</span>
              </a>
            </td>
          </tr>`,
          )
          .join('')}
      </table>`
    : ''

export const reminderDigestHtml = (input: {
  greeting: string
  title: string
  summary: string
  events: ReminderDigestRow[]
  tasks: ReminderDigestRow[]
  actionUrl: string
  settingsUrl: string
  workspaceName?: string
}) =>
  emailFrame(
    `
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_INK};font-weight:600;">Reminder</p>
      <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;color:${EMAIL_INK};">${escapeHtml(input.title)}</h1>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(input.greeting)} ${escapeHtml(input.summary)}</p>
      ${reminderSection('Events', input.events)}
      ${reminderSection('Cards due', input.tasks)}
      <div style="margin-top:20px;">${emailButton('Open calendar', input.actionUrl)}</div>
    `,
    {
      maxWidth: 560,
      workspaceName: input.workspaceName,
      footerNoteHtml: `You get one reminder a day for events in your projects and cards assigned to you. <a href="${escapeHtml(input.settingsUrl)}" style="color:#71717a;">Turn off reminder emails</a>`,
    },
  )
