import { Resend } from 'resend'

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

export const sendEmail = async (input: {
  to: string | string[]
  subject: string
  html: string
  text: string
  idempotencyKey: string
  tags?: { name: string; value: string }[]
}) => {
  const { resend, from } = getResendClient()

  if (!resend || !from) {
    return {
      data: null,
      error: {
        name: 'MissingConfig',
        message: 'RESEND_API_KEY and RESEND_FROM must be set.',
      },
    }
  }

  const delivered = resolveRecipients(from, input)

  const { data, error } = await resend.emails.send({
    from,
    to: delivered.to,
    subject: delivered.subject,
    html: delivered.html,
    text: delivered.text,
    idempotencyKey: input.idempotencyKey,
    tags: input.tags,
  })

  if (error) {
    console.error(error)
  }

  return { data, error }
}

const resolveRecipients = (
  from: string,
  input: { to: string | string[]; subject: string; html: string; text: string },
) => {
  const intended = (Array.isArray(input.to) ? input.to : [input.to]).map((address) =>
    address.trim().toLowerCase(),
  )
  const testInbox = process.env.RESEND_TEST_TO?.trim().toLowerCase()
  const usingTestFrom = from.includes('onboarding@resend.dev')

  if (!usingTestFrom || !testInbox || intended.includes(testInbox)) {
    return {
      to: intended,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }
  }

  const intendedLabel = intended.join(', ')
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
  workspaceName: string
  inviterName: string
  inviteUrl: string
  expiresAt: Date
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

  const html = `
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
          This link expires on ${escapeHtml(expiresLabel)}. If the button does not work, paste this URL into your browser:
        </p>
        <p style="margin:8px 0 0;font-size:12px;word-break:break-all;color:#52525b;">
          ${escapeHtml(input.inviteUrl)}
        </p>
      </div>
    </div>
  `

  return sendEmail({
    to: [input.to],
    subject,
    html,
    text,
    idempotencyKey: `workspace-invite/${input.inviteId}`,
    tags: [
      { name: 'category', value: 'workspace-invite' },
      { name: 'invite_id', value: input.inviteId },
    ],
  })
}

export const sendWorkspaceWelcomeEmail = async (input: {
  inviteId: string
  to: string
  memberName: string
  workspaceName: string
  dashboardUrl: string
}) => {
  const subject = `You joined ${input.workspaceName}`
  const text = [
    `Hi ${input.memberName},`,
    '',
    `You are now a member of ${input.workspaceName}.`,
    `Open the workspace: ${input.dashboardUrl}`,
  ].join('\n')

  const html = emailCard({
    kicker: 'Welcome',
    title: `You're in ${escapeHtml(input.workspaceName)}`,
    body: `Your invite was accepted. You can now open boards, tasks, and work with the rest of the team.`,
    actionLabel: 'Open workspace',
    actionUrl: input.dashboardUrl,
  })

  return sendEmail({
    to: [input.to],
    subject,
    html,
    text,
    idempotencyKey: `workspace-invite-accepted/${input.inviteId}/${input.to}`,
    tags: [
      { name: 'category', value: 'invite-accepted' },
      { name: 'invite_id', value: input.inviteId },
    ],
  })
}

export const sendInviteAcceptedNoticeEmail = async (input: {
  inviteId: string
  to: string
  inviterName: string
  memberName: string
  memberEmail: string
  workspaceName: string
  dashboardUrl: string
}) => {
  const subject = `${input.memberName} joined ${input.workspaceName}`
  const text = [
    `Hi ${input.inviterName},`,
    '',
    `${input.memberName} (${input.memberEmail}) accepted your invite and joined ${input.workspaceName}.`,
    `Open the workspace: ${input.dashboardUrl}`,
  ].join('\n')

  const html = emailCard({
    kicker: 'Invite accepted',
    title: `${escapeHtml(input.memberName)} joined ${escapeHtml(input.workspaceName)}`,
    body: `${escapeHtml(input.memberEmail)} accepted your workspace invite and can now see the boards in this workspace.`,
    actionLabel: 'View workspace',
    actionUrl: input.dashboardUrl,
  })

  return sendEmail({
    to: [input.to],
    subject,
    html,
    text,
    idempotencyKey: `workspace-invite-notice/${input.inviteId}/${input.memberEmail}`,
    tags: [
      { name: 'category', value: 'invite-accepted-notice' },
      { name: 'invite_id', value: input.inviteId },
    ],
  })
}

const emailCard = (input: {
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

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
