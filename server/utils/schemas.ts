/** Zod request schemas for `defineApi` `body` / `query`. */
import { z } from 'zod'
import { ATTACHABLE_TYPES } from '~/server/utils/attachment'
import { isWorkspaceColorId } from '~/utils/task-colors'
import { TASK_STATUS_IDS } from '~/utils/task-status'

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

export const userUpdateSchema = z
  .object({
    activeWorkspaceId: z.string().trim().min(1).nullable().optional(),
    activeProjectId: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (value) =>
      value.activeWorkspaceId !== undefined || value.activeProjectId !== undefined,
    { message: 'Nothing to update.' },
  )

export const workspaceCreateSchema = z.object({
  name: trimmedName('Workspace name'),
  description: optionalString,
})

export const workspaceSettingsSchema = z
  .object({
    emailOnInvite: z.boolean().optional(),
    emailOnProjectAdd: z.boolean().optional(),
    weekStartsOnMonday: z.boolean().optional(),
    backgroundColor: z
      .string()
      .nullable()
      .optional()
      .refine(
        (value) => value === undefined || value === null || isWorkspaceColorId(value),
        { message: 'Pick one of the workspace background colors.' },
      ),
  })
  .refine(
    (value) =>
      value.emailOnInvite !== undefined ||
      value.emailOnProjectAdd !== undefined ||
      value.weekStartsOnMonday !== undefined ||
      value.backgroundColor !== undefined,
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
})

export const taskListQuerySchema = z.object({
  status: z.string().optional(),
  columnId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
})

export const taskCommentSchema = z.object({
  content: trimmedName('Comment'),
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
  memberIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
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

export const taskStatusSchema = z
  .string()
  .refine(
    (value) => TASK_STATUS_IDS.includes(value as (typeof TASK_STATUS_IDS)[number]),
    { message: 'Invalid status.' },
  )
