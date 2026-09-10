const CHIP =
  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset'

const TONE = {
  slate:
    'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800',
  violet:
    'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800',
  emerald:
    'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800',
  amber:
    'bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800',
  teal: 'bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/50 dark:text-teal-300 dark:ring-teal-800',
  orange:
    'bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-800',
  indigo:
    'bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800',
} as const

type Tone = keyof typeof TONE

export const chipClass = (tone: Tone, extra = '') =>
  [CHIP, TONE[tone], extra].filter(Boolean).join(' ')

const ACTIVITY_TONES: Record<string, Tone> = {
  CREATED: 'emerald',
  TITLE_CHANGED: 'sky',
  DESCRIPTION_CHANGED: 'sky',
  MOVED: 'indigo',
  MEMBER_ADDED: 'teal',
  MEMBER_REMOVED: 'orange',
  LABEL_ADDED: 'violet',
  LABEL_REMOVED: 'orange',
  DATES_UPDATED: 'amber',
  COVER_CHANGED: 'violet',
  PRIORITY_CHANGED: 'amber',
  STATUS_CHANGED: 'indigo',
  COMPLETED: 'emerald',
  REOPENED: 'sky',
  COMMENT: 'sky',
  ATTACHMENT_ADDED: 'teal',
  ATTACHMENT_REMOVED: 'orange',
  LIKED: 'rose',
  UNLIKED: 'slate',
  ARCHIVED: 'orange',
  RESTORED: 'teal',
  EMAIL_SENT: 'emerald',
  EMAIL_FAILED: 'rose',
}

export const activityTypeChip = (type: string) =>
  chipClass(ACTIVITY_TONES[type] ?? 'slate', 'capitalize')

const TEMPLATE_TONES: Record<string, Tone> = {
  'workspace-invite': 'violet',
  'invite-accepted': 'emerald',
  'invite-accepted-notice': 'sky',
  'project-member': 'amber',
  custom: 'indigo',
}

export const emailTemplateChip = (template: string) =>
  chipClass(TEMPLATE_TONES[template] ?? 'slate')

export const emailStatusChip = (status: string) =>
  chipClass(status === 'sent' ? 'emerald' : 'rose', 'capitalize')

const INVOICE_TONES: Record<string, Tone> = {
  paid: 'emerald',
  open: 'amber',
  draft: 'sky',
  upcoming: 'sky',
  void: 'slate',
  uncollectible: 'rose',
}

export const invoiceStatusChip = (status: string) =>
  chipClass(INVOICE_TONES[status] ?? 'slate', 'capitalize')

const BILLING_EVENT_TONES: Record<string, Tone> = {
  checkout_started: 'sky',
  checkout_completed: 'teal',
  subscribed: 'emerald',
  plan_changed: 'violet',
  invoice_paid: 'emerald',
  invoice_failed: 'rose',
  canceled: 'orange',
  portal_opened: 'slate',
  seats_updated: 'amber',
}

export const billingEventChip = (type: string) =>
  chipClass(BILLING_EVENT_TONES[type] ?? 'slate')

const ARCHIVE_TONES: Record<string, Tone> = {
  list: 'sky',
  card: 'violet',
  project: 'amber',
}

export const archiveKindChip = (kind: string) =>
  chipClass(ARCHIVE_TONES[kind] ?? 'slate')

export const whenChip = (value: Date | string | null | undefined) => {
  if (!value) return chipClass('slate')
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return chipClass('slate')
  const delta = Date.now() - date.getTime()
  const hour = 60 * 60 * 1000
  if (delta < hour) return chipClass('emerald')
  if (delta < 24 * hour) return chipClass('sky')
  if (delta < 7 * 24 * hour) return chipClass('violet')
  return chipClass('slate')
}
