/** Zod request schemas for `defineApi` `body` / `query`. */
import { z } from 'zod'
import { ATTACHABLE_TYPES } from '~/server/utils/attachable-types'
import { isTaskColorId } from '~/utils/task-colors'
import { TASK_STATUS_IDS } from '~/utils/task-status'
import { normalizeSubdomain, subdomainError } from '~/utils/subdomain'
import { isValidTimeZone } from '~/server/utils/reminder-time'
import { AI_PLAN_GOAL_MAX, AI_PLAN_GOAL_MIN, AI_PLAN_MAX_TASKS } from '~/utils/ai-plan'

export const idSchema = z.string().trim().min(1, 'id is required')

export const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase())

export const trimmedName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'A valid color is required.')

export const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value !== 'all' && value !== 'none' ? value : undefined))

const optionalString = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) return undefined
    if (value === null) return null
    const trimmed = value.trim()
    return trimmed || null
  })

export const subdomainSchema = z
  .string()
  .transform(normalizeSubdomain)
  .superRefine((value, ctx) => {
    const message = subdomainError(value)
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message })
  })

export const signUpSchema = z.object({
  name: trimmedName('Name'),
  email: emailSchema,
  password: z.string().min(8, 'Use at least 8 characters'),
  subdomain: subdomainSchema,
})

export const subdomainCheckSchema = z.object({ subdomain: subdomainSchema })

export const userUpdateSchema = z
  .object({
    activeWorkspaceId: z.string().trim().min(1).nullable().optional(),
    activeProjectId: z.string().trim().min(1).nullable().optional(),
    timezone: z
      .string()
      .trim()
      .max(64)
      .refine(isValidTimeZone, { message: 'Unknown time zone.' })
      .optional(),
    reminderEmails: z.boolean().optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: 'Nothing to update.' },
  )

export const workspaceCreateSchema = z.object({
  name: trimmedName('Workspace name').max(
    50,
    'Workspace name must be 50 characters or less.',
  ),
  description: optionalString,
})

export const workspaceSettingsSchema = z
  .object({
    emailOnInvite: z.boolean().optional(),
    emailOnProjectAdd: z.boolean().optional(),
    weekStartsOnMonday: z.boolean().optional(),
    emailReminders: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.emailOnInvite !== undefined ||
      value.emailOnProjectAdd !== undefined ||
      value.weekStartsOnMonday !== undefined ||
      value.emailReminders !== undefined,
    { message: 'Nothing to update.' },
  )

export const workspaceInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value.toLowerCase() : null)),
})

export const workspaceMemberSchema = z.object({
  email: emailSchema,
})

export const workspaceEmailSchema = z
  .object({
    to: emailSchema,
    subject: trimmedName('Subject'),
    kicker: z.string().trim().optional().default('Update'),
    title: trimmedName('Title'),
    body: trimmedName('Message'),
    actionLabel: z.string().trim().optional().default(''),
    actionUrl: z.string().trim().optional().default(''),
    projectId: z.string().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const label = value.actionLabel
    const url = value.actionUrl
    if ((label && !url) || (!label && url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Button label and URL are both required if you add a button.',
      })
    }
    if (url && !/^https?:\/\//i.test(url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Button URL must start with http:// or https://.',
      })
    }
  })
  .transform((value) => ({
    ...value,
    projectId:
      value.projectId && !['all', 'none', ''].includes(value.projectId)
        ? value.projectId
        : null,
    actionLabel: value.actionLabel || undefined,
    actionUrl: value.actionUrl || undefined,
  }))

export const activitiesQuerySchema = z.object({
  projectId: optionalId,
  taskId: optionalId,
  kind: z.string().optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(12),
})

export const memberActivitiesQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(64).optional(),
})

export const emailsQuerySchema = z.object({
  projectId: optionalId,
  template: optionalId,
  box: z
    .string()
    .optional()
    .transform((value) => (value === 'inbox' ? 'inbox' : 'sent')),
})

export const projectCreateSchema = z.object({
  workspaceId: idSchema,
  name: trimmedName('Project name'),
  description: optionalString,
})

export const projectUpdateSchema = z
  .object({
    archived: z.boolean().optional(),
    name: z.string().trim().min(1, 'Project name is required.').optional(),
    description: optionalString,
  })
  .refine(
    (value) =>
      value.archived !== undefined ||
      value.name !== undefined ||
      value.description !== undefined,
    { message: 'Nothing to update.' },
  )

export const projectColumnCreateSchema = z.object({
  name: trimmedName('Column name'),
})

export const projectLabelCreateSchema = z.object({
  name: trimmedName('Label name'),
  color: hexColorSchema,
  taskId: z.string().trim().min(1).optional(),
})

export const projectMemberSchema = z.object({
  userId: idSchema,
})

export const taskCreateSchema = z.object({
  columnId: idSchema,
  title: trimmedName('Title'),
  description: optionalString,
  sprintId: z.string().trim().min(1).nullable().optional(),
})

const aiPlanGoalSchema = z
  .string()
  .trim()
  .min(AI_PLAN_GOAL_MIN, 'Describe the work in a sentence or two.')
  .max(AI_PLAN_GOAL_MAX, `Keep it under ${AI_PLAN_GOAL_MAX} characters.`)

export const aiTaskPlanRequestSchema = z.object({
  columnId: idSchema,
  goal: aiPlanGoalSchema,
})

export const aiPlanTaskSchema = z.object({
  title: trimmedName('Title').max(120, 'Keep titles under 120 characters.'),
  description: optionalString,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
})

export const aiTaskPlanApplySchema = z.object({
  columnId: idSchema,
  goal: aiPlanGoalSchema,
  sprintId: z.string().trim().min(1).nullable().optional(),
  tasks: z
    .array(aiPlanTaskSchema)
    .min(1, 'Pick at least one task to create.')
    .max(AI_PLAN_MAX_TASKS, `Create at most ${AI_PLAN_MAX_TASKS} tasks at once.`),
})

const calendarDateSchema = z.coerce.date({
  errorMap: () => ({ message: 'A valid date is required.' }),
})

export const CALENDAR_MAX_RANGE_DAYS = 100

export const calendarRangeQuerySchema = z
  .object({ from: calendarDateSchema, to: calendarDateSchema })
  .refine((value) => value.to > value.from, {
    message: '`to` must be after `from`.',
  })
  .refine(
    (value) =>
      value.to.getTime() - value.from.getTime() <=
      CALENDAR_MAX_RANGE_DAYS * 86_400_000,
    { message: `Ask for at most ${CALENDAR_MAX_RANGE_DAYS} days at once.` },
  )

export const calendarEventFieldsSchema = z.object({
  title: trimmedName('Title').max(200, 'Keep titles under 200 characters.'),
  description: optionalString,
  location: optionalString,
  startAt: calendarDateSchema,
  endAt: calendarDateSchema,
  allDay: z.boolean().default(false),
  color: z
    .string()
    .refine(isTaskColorId, { message: 'Pick a colour from the palette.' })
    .nullable()
    .optional(),
})

export const calendarConnectionCreateSchema = z.object({
  calendarId: z.string().trim().min(1, 'Pick a calendar.').max(1024),
  color: calendarEventFieldsSchema.shape.color,
})

export const calendarEventCreateSchema = calendarEventFieldsSchema.refine(
  (value) => value.endAt >= value.startAt,
  { message: 'The event must end after it starts.', path: ['endAt'] },
)

export const calendarEventUpdateSchema = calendarEventFieldsSchema
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Nothing to update.',
  })

export const cronRemindersQuerySchema = z.object({
  dryRun: z
    .enum(['1', '0', 'true', 'false'])
    .optional()
    .transform((value) => value === '1' || value === 'true'),
  /** Simulated clock for local testing; ignored in production. */
  now: z.coerce.date().optional(),
})

export const taskListQuerySchema = z.object({
  status: z.string().optional(),
  columnId: z.string().optional(),
  sprint: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
})

export const boardQuerySchema = z.object({
  sprint: z.string().optional(),
})

export const sprintCreateSchema = z.object({
  name: trimmedName('Sprint name'),
  goal: optionalString,
  plannedStartAt: z.string().trim().optional().nullable(),
  plannedEndAt: z.string().trim().optional().nullable(),
  start: z.boolean().optional().default(true),
  pullBacklog: z.boolean().optional(),
})

export const sprintUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Sprint name is required.').optional(),
    goal: optionalString,
    plannedStartAt: z.string().trim().optional().nullable(),
    plannedEndAt: z.string().trim().optional().nullable(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
    unfinishedDestination: z.enum(['backlog', 'next']).optional(),
    pullBacklog: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.goal !== undefined ||
      value.plannedStartAt !== undefined ||
      value.plannedEndAt !== undefined ||
      value.status !== undefined,
    { message: 'Nothing to update.' },
  )

export const taskCommentSchema = z.object({
  content: trimmedName('Comment'),
})

export const AI_CHAT_MAX_LENGTH = 2000

export const aiChatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(AI_CHAT_MAX_LENGTH, `Keep messages under ${AI_CHAT_MAX_LENGTH} characters.`),
})

export const taskUpdateSchema = z.object({
  archived: z.boolean().optional(),
  order: z.number().optional(),
  columnId: z.string().trim().min(1).optional(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  completed: z.boolean().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
  dueDate: z.union([z.string(), z.null()]).optional(),
  coverColor: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  coverThumb: z.string().nullable().optional(),
  coverCredit: z.string().nullable().optional(),
  coverCreditUrl: z.string().nullable().optional(),
  memberIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
  sprintId: z.string().trim().min(1).nullable().optional(),
})

export const columnUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Column name is required.').optional(),
    direction: z.enum(['left', 'right']).optional(),
    color: z.string().nullable().optional(),
    archived: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.direction !== undefined ||
      value.color !== undefined ||
      value.archived !== undefined,
    { message: 'Nothing to update.' },
  )

export const attachmentsQuerySchema = z.object({
  attachableType: z.enum(ATTACHABLE_TYPES, {
    errorMap: () => ({ message: 'attachableType and attachableId are required.' }),
  }),
  attachableId: idSchema,
})

export const billingCheckoutSchema = z.object({
  plan: z.enum(['team', 'business']),
  interval: z.enum(['month', 'year']).default('month'),
})

export const billingSyncSchema = z.object({
  sessionId: z.string().trim().min(1, 'sessionId is required'),
})

export const billingQuerySchema = z.object({
  workspaceId: optionalId,
})

export const billingEventsQuerySchema = z.object({
  workspaceId: optionalId,
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
})

export const ablyTokenSchema = z.object({
  clientId: z
    .string()
    .trim()
    .min(8, 'clientId is required')
    .max(64, 'clientId is too long'),
  projectId: idSchema.optional(),
  workspaceId: idSchema.optional(),
})

export const taskStatusSchema = z
  .string()
  .refine(
    (value) => TASK_STATUS_IDS.includes(value as (typeof TASK_STATUS_IDS)[number]),
    { message: 'Invalid status.' },
  )
