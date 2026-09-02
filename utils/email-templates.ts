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

export const emailCardHtml = (input: {
  kicker: string
  title: string
  body: string
  actionLabel: string
  actionUrl: string
}) => `
  <div style="background:#f4f4f5;padding:32px 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e4e4e7;">
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;font-weight:600;">${escapeHtml(input.kicker)}</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#18181b;">${input.title}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">${input.body}</p>
      <a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:10px;">
        ${escapeHtml(input.actionLabel)}
      </a>
    </div>
  </div>
`

export const workspaceInviteHtml = (input: {
  workspaceName: string
  inviterName: string
  inviteUrl: string
  expiresLabel: string
}) => `
  <div style="background:#f4f4f5;padding:32px 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e4e4e7;">
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;font-weight:600;">Workspace invite</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#18181b;">Join ${escapeHtml(input.workspaceName)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
        ${escapeHtml(input.inviterName)} invited you to collaborate on
        <strong>${escapeHtml(input.workspaceName)}</strong>.
      </p>
      <a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:10px;">
        Accept invite
      </a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#71717a;">
        This link expires on ${escapeHtml(input.expiresLabel)}. If the button does not work, paste this URL into your browser:
      </p>
      <p style="margin:8px 0 0;font-size:12px;word-break:break-all;color:#52525b;">
        ${escapeHtml(input.inviteUrl)}
      </p>
    </div>
  </div>
`

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
    })
  }
  if (id === 'invite-accepted-notice') {
    return emailCardHtml({
      kicker: 'Invite accepted',
      title: 'Jordan Lee joined Northstar',
      body: 'jordan@example.com accepted your workspace invite and can now see the boards in this workspace.',
      actionLabel: 'View workspace',
      actionUrl: 'https://example.com/dashboard',
    })
  }
  if (id === 'custom') {
    return customEmailHtml({
      kicker: 'Update',
      title: 'Sprint wrap-up',
      body: 'The board is up to date. Please review open cards before Friday.',
      actionLabel: 'Open workspace',
      actionUrl: 'https://example.com/dashboard',
    })
  }
  return emailCardHtml({
    kicker: 'Project access',
    title: "You've been added to Website launch",
    body: 'Alex Rivera added you to Website launch in Northstar. You can now open the board and work on tasks.',
    actionLabel: 'Open project',
    actionUrl: 'https://example.com/dashboard',
  })
}

export const customEmailHtml = (input: {
  kicker: string
  title: string
  body: string
  actionLabel?: string
  actionUrl?: string
}) => {
  const body = escapeHtml(input.body).replaceAll('\n', '<br>')
  const title = escapeHtml(input.title)
  const kicker = input.kicker.trim() || 'Message'
  const actionLabel = input.actionLabel?.trim()
  const actionUrl = input.actionUrl?.trim()

  if (actionLabel && actionUrl) {
    return emailCardHtml({
      kicker,
      title,
      body,
      actionLabel,
      actionUrl,
    })
  }

  return `
  <div style="background:#f4f4f5;padding:32px 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e4e4e7;">
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;font-weight:600;">${escapeHtml(kicker)}</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#18181b;">${title}</h1>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">${body}</p>
    </div>
  </div>
`
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
