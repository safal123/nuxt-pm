import { format } from 'date-fns'
import prisma from '~/lib/prisma'
import { completeChat } from '~/server/utils/ai'
import { assertCanUseAiSummaries } from '~/server/utils/billing'
import { personSelect } from '~/server/utils/person'
import { getTaskWithDetails, personName, validateTaskAccess } from '~/server/utils/task'
import { isSummaryLimitedToday, summaryBullets } from '~/utils/ai-summary'
import { statusLabel } from '~/utils/task-status'

export type TaskSummaryResult = {
  progress: string
  furtherAction: string
  generatedAt: Date
}

type SummaryContext = {
  title: string
  description: string | null
  status: string
  priority: string
  projectName: string | null
  columnName: string | null
  sprintName: string | null
  sprintStatus: string | null
  dueDate: Date | string | null
  createdAt: Date | string | null
  completedAt: Date | string | null
  creator: string | null
  members: string[]
  labels: string[]
  attachments: { name: string; uploader: string }[]
  comments: { at: string; author: string; content: string }[]
  activities: { at: string; actor: string; type: string; message: string; detail: string | null }[]
  previous: { progress: string; furtherAction: string; generatedAt: string } | null
}

const SYSTEM_PROMPT = `You write an actionable briefing for a project card. Use only the facts in the card history. Do not invent people, dates, or work.

Reply with JSON only, no markdown, with these keys:
- progress: an array of 3-6 short bullet strings. Each bullet is one fact, under 15 words: what the card is, what happened, key comments, blockers, current state. Put the most important point first.
- furtherAction: an array of 2-4 short bullet strings. Each starts with a verb and names the owner when the history makes that clear, e.g. "Ada: retest login on Safari".

Plain wording, no filler, no bullet symbols inside the strings.

If a previous summary is provided, treat it as background: keep facts that are still true, correct anything the newer comments or activity supersede, and add what happened since.`

export const when = (value: Date | string | null | undefined) => {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return format(date, 'MMM d, yyyy h:mm a')
}

export const activityDetail = (metadata: unknown) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const row = metadata as Record<string, unknown>
  const parts = ['content', 'name', 'from', 'to', 'title']
    .map((key) => {
      const value = row[key]
      if (value == null || value === '') return null
      return `${key}: ${String(value).slice(0, 220)}`
    })
    .filter(Boolean)
  return parts.length ? parts.join('; ') : null
}

const toBulletText = (value: unknown) => {
  const items = Array.isArray(value) ? value.map(String) : [String(value ?? '')]
  return items
    .flatMap((item) => summaryBullets(item))
    .join('\n')
}

export const parseSummaryJson = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed || /enough credits|insufficient balance|payment required/i.test(trimmed)) {
    return null
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced?.[1]?.trim() ?? trimmed
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return null

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
    const progress = toBulletText(parsed.progress)
    const furtherAction = toBulletText(parsed.furtherAction ?? parsed.further_action)
    if (!progress || !furtherAction) return null
    return { progress, furtherAction }
  } catch {
    return null
  }
}

export const fallbackSummary = (context: SummaryContext) => {
  const status = statusLabel(context.status)
  const latestComment = context.comments.at(-1)
  const latestActivity = context.activities.at(-1)
  const due = context.dueDate
    ? `, due ${format(new Date(context.dueDate), 'MMM d')}`
    : ''

  const progress = [
    `${status} in ${context.columnName || 'its list'}${due}`,
    context.members.length
      ? `On the card: ${context.members.join(', ')}`
      : 'No one is assigned yet',
    ...context.comments
      .slice(-2)
      .map((comment) => `${comment.author}: ${comment.content.slice(0, 120)}`),
    !context.comments.length && latestActivity
      ? `Latest: ${latestActivity.actor} ${latestActivity.message}`
      : null,
    !context.comments.length && !latestActivity ? 'No comments yet' : null,
  ].filter(Boolean)

  const furtherAction =
    context.status === 'DONE'
      ? ['Confirm the work is accepted', 'Archive the card if nothing is left']
      : context.status === 'BLOCKED'
        ? latestComment
          ? [`Clear the blocker: ${latestComment.content.slice(0, 100)}`, 'Comment when it is unblocked']
          : ['Name the blocker in a comment', 'Ask the person who can clear it']
        : context.status === 'IN_REVIEW'
          ? ['Get a review from a teammate', 'Mark done once approved']
          : context.members.length
            ? ['Post a short status comment', 'Take the next concrete step']
            : ['Add an owner to this card', 'Start the first step']

  return { progress: progress.join('\n'), furtherAction: furtherAction.join('\n') }
}

export const buildPrompt = (context: SummaryContext) => {
  const lines = [
    `Project: ${context.projectName || 'unknown'}`,
    `Title: ${context.title}`,
    `Status: ${statusLabel(context.status)}`,
    `Priority: ${context.priority}`,
    `List: ${context.columnName || 'unknown'}`,
    context.sprintName
      ? `Sprint: ${context.sprintName}${context.sprintStatus ? ` (${context.sprintStatus})` : ''}`
      : 'Sprint: backlog',
    `Created: ${when(context.createdAt) || 'unknown'}${context.creator ? ` by ${context.creator}` : ''}`,
    context.completedAt ? `Completed: ${when(context.completedAt)}` : null,
    context.dueDate ? `Due: ${format(new Date(context.dueDate), 'yyyy-MM-dd')}` : 'Due: none',
    `Members: ${context.members.join(', ') || 'none'}`,
    `Labels: ${context.labels.join(', ') || 'none'}`,
    context.description ? `Description:\n${context.description.slice(0, 2000)}` : 'Description: none',
    context.attachments.length
      ? `Files:\n${context.attachments
          .map((file) => `- ${file.name}${file.uploader ? ` (uploaded by ${file.uploader})` : ''}`)
          .join('\n')}`
      : 'Files: none',
    context.previous
      ? `Previous summary (generated ${context.previous.generatedAt}):\nProgress:\n${context.previous.progress}\nFurther action:\n${context.previous.furtherAction}`
      : 'Previous summary: none — this is the first briefing.',
    context.comments.length
      ? `Comments (oldest first):\n${context.comments
          .map((comment) => `- [${comment.at}] ${comment.author}: ${comment.content}`)
          .join('\n')}`
      : 'Comments: none',
    context.activities.length
      ? `Activity (oldest first):\n${context.activities
          .map((item) => {
            const line = `- [${item.at}] ${item.actor} ${item.message} (${item.type})`
            return item.detail ? `${line}\n  ${item.detail}` : line
          })
          .join('\n')}`
      : 'Activity: none',
  ].filter(Boolean)

  return lines.join('\n\n')
}

const loadSummarySource = async (taskId: string) => {
  const [task, attachments] = await Promise.all([
    prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        column: { select: { name: true } },
        project: { select: { name: true } },
        sprint: { select: { name: true, status: true } },
        creator: { select: personSelect },
        members: { include: { user: { select: personSelect } } },
        taskLabels: { include: { label: { select: { name: true } } } },
        comments: {
          orderBy: { createdAt: 'asc' },
          take: 40,
          include: { user: { select: personSelect } },
        },
        activities: {
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: { user: { select: personSelect } },
        },
      },
    }),
    prisma.attachment.findMany({
      where: { attachableType: 'Task', attachableId: taskId },
      orderBy: { createdAt: 'asc' },
      take: 20,
      include: { uploader: { select: personSelect } },
    }),
  ])

  return { ...task, attachments }
}

export const findLatestAiSummary = (attachableType: string, attachableId: string) =>
  prisma.aiSummary.findFirst({
    where: { attachableType, attachableId },
    orderBy: { generatedAt: 'desc' },
  })

export const toContext = (
  task: Awaited<ReturnType<typeof loadSummarySource>>,
  previous: {
    progress: string
    furtherAction: string
    generatedAt: Date | string | null
  } | null,
): SummaryContext => ({
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  projectName: task.project?.name ?? null,
  columnName: task.column?.name ?? null,
  sprintName: task.sprint?.name ?? null,
  sprintStatus: task.sprint?.status ?? null,
  dueDate: task.dueDate,
  createdAt: task.createdAt,
  completedAt: task.completedAt,
  creator: task.creator ? personName(task.creator) : null,
  members: Array.isArray(task.members)
    ? task.members.map((member) => personName(member.user)).filter(Boolean)
    : [],
  labels: (task.taskLabels ?? [])
    .map((link) => link.label?.name)
    .filter((name): name is string => Boolean(name)),
  attachments: (task.attachments ?? []).map((file) => ({
    name: file.name,
    uploader: file.uploader ? personName(file.uploader) : '',
  })),
  comments: (task.comments ?? []).map((comment) => ({
    at: when(comment.createdAt) || 'unknown',
    author: personName(comment.user),
    content: String(comment.content || '').slice(0, 800),
  })),
  activities: (task.activities ?? []).map((item) => ({
    at: when(item.createdAt) || 'unknown',
    actor: personName(item.user),
    type: item.type,
    message: String(item.message || ''),
    detail: activityDetail(item.metadata),
  })),
  previous: previous
    ? {
        progress: previous.progress,
        furtherAction: previous.furtherAction,
        generatedAt: when(previous.generatedAt) || 'earlier',
      }
    : null,
})

export const summarizeWithAi = async (systemPrompt: string, prompt: string) => {
  const text = await completeChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ])
  return text ? parseSummaryJson(text) : null
}

const generateFromContext = async (context: SummaryContext) =>
  (await summarizeWithAi(SYSTEM_PROMPT, buildPrompt(context))) ??
  fallbackSummary(context)

export const generateTaskSummary = async (
  taskId: string,
  userId: string,
  email?: string | null,
) => {
  const access = await validateTaskAccess(taskId, userId)
  await assertCanUseAiSummaries(access.workspaceId, email)
  const existing = await findLatestAiSummary('Task', taskId)

  if (existing && isSummaryLimitedToday(existing.generatedAt, email)) {
    return {
      task: await getTaskWithDetails(taskId, userId),
      created: false,
    }
  }

  const source = await loadSummarySource(taskId)
  const generated = await generateFromContext(toContext(source, existing))
  const generatedAt = new Date()

  await prisma.aiSummary.create({
    data: {
      workspaceId: access.workspaceId,
      attachableType: 'Task',
      attachableId: taskId,
      progress: generated.progress,
      furtherAction: generated.furtherAction,
      generatedAt,
      generatedBy: userId,
    },
  })

  return {
    task: await getTaskWithDetails(taskId, userId),
    created: true,
  }
}
