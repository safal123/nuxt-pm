import { format } from 'date-fns'
import prisma from '~/lib/prisma'
import { completeChat, type AiMessage } from '~/server/utils/ai'
import { assertCanUseAiSummaries } from '~/server/utils/billing'
import { personSelect } from '~/server/utils/person'
import { validateProjectAccess } from '~/server/utils/project'
import { personName } from '~/server/utils/task'
import {
  activityDetail,
  findLatestAiSummary,
  summarizeWithAi,
  when,
} from '~/server/utils/task-summary'
import { serializeTaskSummary } from '~/server/utils/task'
import { isSummaryLimitedToday } from '~/utils/ai-summary'
import { statusLabel } from '~/utils/task-status'

const PROJECT_SUMMARY_PROMPT = `You write a short briefing for a whole project board. Use only the facts in the project data. Do not invent people, dates, or work.

Reply with JSON only, no markdown, with these keys:
- progress: an array of 4-7 short bullet strings, each under 18 words: overall state, what moved recently, what shipped, blockers, overdue or at-risk cards, sprint progress. Most important first. Name cards in quotes.
- furtherAction: an array of 2-5 short bullet strings. Each starts with a verb and names the owner when the data makes that clear.

Plain wording, no filler, no bullet symbols inside the strings.

If a previous briefing is provided, keep facts that are still true, correct anything newer activity supersedes, and say what changed since.`

const CHAT_PROMPT = `You are the project assistant inside Northstar, a project board app. Answer questions about the project below using only its data. If the data does not say, reply that you can't tell from the board. Today is {today}.

Format replies in light markdown so they read well in a chat bubble:
- Start with one short sentence that answers the question.
- Then use "- " bullets, one card or point per bullet, at most 6.
- Bold card names like **Card name** (no quotes). Put status, priority, and due info after an em dash.
- Name at most 3 people per bullet, then "+N more".
- Optionally end with one short "Tip:" line if something looks wrong on the board.
No tables, no headings, no code blocks. Keep it under 120 words.`

const SUMMARY_HISTORY_LIMIT = 30
const CHAT_HISTORY_LIMIT = 12
const CHAT_LIST_LIMIT = 100

const loadProjectSource = async (projectId: string) => {
  const [project, tasks, activities, comments] = await Promise.all([
    prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        columns: {
          where: { archivedAt: null },
          orderBy: { order: 'asc' },
          select: { id: true, name: true },
        },
        sprints: {
          where: { status: { in: ['ACTIVE', 'PLANNED'] } },
          orderBy: { number: 'asc' },
          take: 3,
        },
        members: { include: { user: { select: personSelect } } },
      },
    }),
    prisma.task.findMany({
      where: { projectId, archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 80,
      include: {
        column: { select: { name: true } },
        sprint: { select: { name: true } },
        members: { include: { user: { select: personSelect } } },
      },
    }),
    prisma.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        user: { select: personSelect },
        task: { select: { title: true } },
      },
    }),
    prisma.taskComment.findMany({
      where: { task: { projectId } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: personSelect },
        task: { select: { title: true } },
      },
    }),
  ])

  return { project, tasks, activities: activities.reverse(), comments: comments.reverse() }
}

type ProjectSource = Awaited<ReturnType<typeof loadProjectSource>>

const isOverdue = (task: ProjectSource['tasks'][number], now: Date) =>
  task.status !== 'DONE' && !!task.dueDate && task.dueDate < now

export const buildProjectPrompt = (
  source: ProjectSource,
  previous: { progress: string; furtherAction: string; generatedAt: Date } | null,
) => {
  const { project, tasks, activities, comments } = source
  const now = new Date()
  const counts = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1
    return acc
  }, {})
  const overdue = tasks.filter((task) => isOverdue(task, now))

  const taskLine = (task: ProjectSource['tasks'][number]) => {
    const people = task.members.map((member) => personName(member.user)).filter(Boolean)
    return [
      `- "${task.title}"`,
      statusLabel(task.status),
      task.priority,
      `list: ${task.column?.name ?? 'unknown'}`,
      task.sprint ? `sprint: ${task.sprint.name}` : null,
      people.length ? `owners: ${people.join(', ')}` : 'unassigned',
      task.dueDate ? `due ${format(task.dueDate, 'yyyy-MM-dd')}${isOverdue(task, now) ? ' (OVERDUE)' : ''}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  const lines = [
    `Project: ${project.name}`,
    project.description ? `Description:\n${project.description.slice(0, 1500)}` : null,
    `Lists: ${project.columns.map((column) => column.name).join(', ') || 'none'}`,
    `Members: ${project.members.map((member) => personName(member.user)).filter(Boolean).join(', ') || 'none'}`,
    project.sprints.length
      ? `Sprints:\n${project.sprints
          .map((sprint) =>
            [
              `- ${sprint.name} (${sprint.status.toLowerCase()})`,
              sprint.goal ? `goal: ${sprint.goal}` : null,
              sprint.plannedEndAt ? `ends ${format(sprint.plannedEndAt, 'yyyy-MM-dd')}` : null,
            ]
              .filter(Boolean)
              .join(' · '),
          )
          .join('\n')}`
      : 'Sprints: none active',
    `Card counts: ${Object.entries(counts)
      .map(([status, count]) => `${statusLabel(status)} ${count}`)
      .join(', ') || 'no cards'}; overdue ${overdue.length}`,
    tasks.length
      ? `Cards (most recently updated first):\n${tasks.map(taskLine).join('\n')}`
      : 'Cards: none',
    previous
      ? `Previous briefing (generated ${when(previous.generatedAt)}):\nProgress:\n${previous.progress}\nFurther action:\n${previous.furtherAction}`
      : 'Previous briefing: none — this is the first one.',
    comments.length
      ? `Recent comments (oldest first):\n${comments
          .map(
            (comment) =>
              `- [${when(comment.createdAt)}] ${personName(comment.user)} on "${comment.task.title}": ${comment.content.slice(0, 300)}`,
          )
          .join('\n')}`
      : 'Recent comments: none',
    activities.length
      ? `Recent activity (oldest first):\n${activities
          .map((item) => {
            const target = item.task ? ` ("${item.task.title}")` : ''
            const line = `- [${when(item.createdAt)}] ${personName(item.user)} ${item.message}${target}`
            const detail = activityDetail(item.metadata)
            return detail ? `${line}\n  ${detail}` : line
          })
          .join('\n')}`
      : 'Recent activity: none',
  ].filter(Boolean)

  return lines.join('\n\n')
}

const fallbackProjectSummary = (source: ProjectSource) => {
  const now = new Date()
  const open = source.tasks.filter((task) => task.status !== 'DONE')
  const done = source.tasks.length - open.length
  const blocked = open.filter((task) => task.status === 'BLOCKED')
  const overdue = open.filter((task) => isOverdue(task, now))
  const latest = source.activities.at(-1)
  const sprint = source.project.sprints.find((item) => item.status === 'ACTIVE')

  const progress = [
    `${open.length} open cards, ${done} done`,
    sprint ? `Active sprint: ${sprint.name}` : 'No active sprint',
    blocked.length ? `Blocked: ${blocked.slice(0, 3).map((task) => `"${task.title}"`).join(', ')}` : null,
    overdue.length ? `Overdue: ${overdue.slice(0, 3).map((task) => `"${task.title}"`).join(', ')}` : null,
    latest ? `Latest: ${personName(latest.user)} ${latest.message}` : 'No activity yet',
  ].filter(Boolean)

  const furtherAction = [
    blocked.length ? 'Clear the blocked cards first' : null,
    overdue.length ? 'Reschedule or finish overdue cards' : null,
    open.some((task) => !task.members.length) ? 'Assign owners to unassigned cards' : null,
    'Post a status update on cards in progress',
  ].filter(Boolean)

  return { progress: progress.join('\n'), furtherAction: furtherAction.join('\n') }
}

export const listProjectSummaries = async (projectId: string) => {
  const rows = await prisma.aiSummary.findMany({
    where: { attachableType: 'Project', attachableId: projectId },
    orderBy: { generatedAt: 'desc' },
    take: SUMMARY_HISTORY_LIMIT,
  })
  return rows.map((row) => serializeTaskSummary(row))
}

export const generateProjectSummary = async (
  projectId: string,
  userId: string,
  email?: string | null,
) => {
  const project = await validateProjectAccess(projectId, userId)
  await assertCanUseAiSummaries(project.workspaceId, email)
  const existing = await findLatestAiSummary('Project', projectId)

  if (existing && isSummaryLimitedToday(existing.generatedAt, email)) {
    return { created: false }
  }

  const source = await loadProjectSource(projectId)
  const generated =
    (await summarizeWithAi(PROJECT_SUMMARY_PROMPT, buildProjectPrompt(source, existing))) ??
    fallbackProjectSummary(source)

  await prisma.aiSummary.create({
    data: {
      workspaceId: project.workspaceId,
      attachableType: 'Project',
      attachableId: projectId,
      progress: generated.progress,
      furtherAction: generated.furtherAction,
      generatedAt: new Date(),
      generatedBy: userId,
    },
  })

  return { created: true }
}

const serializeChatMessage = (row: {
  id: string
  role: string
  content: string
  createdAt: Date
}) => ({
  id: row.id,
  role: row.role === 'assistant' ? ('assistant' as const) : ('user' as const),
  content: row.content,
  at: row.createdAt.toISOString(),
})

const chatWhere = (projectId: string, userId: string) => ({
  attachableType: 'Project',
  attachableId: projectId,
  userId,
})

export const listProjectChat = async (projectId: string, userId: string) => {
  const rows = await prisma.aiChatMessage.findMany({
    where: chatWhere(projectId, userId),
    orderBy: { createdAt: 'desc' },
    take: CHAT_LIST_LIMIT,
  })
  return rows.reverse().map(serializeChatMessage)
}

export const clearProjectChat = async (projectId: string, userId: string) => {
  await validateProjectAccess(projectId, userId)
  await prisma.aiChatMessage.deleteMany({ where: chatWhere(projectId, userId) })
}

export const chatAboutProject = async (
  projectId: string,
  userId: string,
  email: string | null | undefined,
  content: string,
) => {
  const project = await validateProjectAccess(projectId, userId)
  await assertCanUseAiSummaries(project.workspaceId, email)

  const [source, latest, history] = await Promise.all([
    loadProjectSource(projectId),
    findLatestAiSummary('Project', projectId),
    prisma.aiChatMessage.findMany({
      where: chatWhere(projectId, userId),
      orderBy: { createdAt: 'desc' },
      take: CHAT_HISTORY_LIMIT,
    }),
  ])

  const conversation: AiMessage[] = [
    {
      role: 'system',
      content: `${CHAT_PROMPT.replace('{today}', format(new Date(), 'yyyy-MM-dd'))}\n\n${buildProjectPrompt(source, latest)}`,
    },
    ...history.reverse().map((row) => ({
      role: row.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: row.content,
    })),
    { role: 'user', content },
  ]

  const reply = await completeChat(conversation, { temperature: 0.4 })
  if (!reply) {
    throw createError({
      statusCode: 503,
      message: 'AI chat is not available right now. Try again in a moment.',
    })
  }

  const askedAt = new Date()
  const base = { ...chatWhere(projectId, userId), workspaceId: project.workspaceId }
  const [question, answer] = await prisma.$transaction([
    prisma.aiChatMessage.create({
      data: { ...base, role: 'user', content, createdAt: askedAt },
    }),
    prisma.aiChatMessage.create({
      data: {
        ...base,
        role: 'assistant',
        content: reply,
        createdAt: new Date(askedAt.getTime() + 1),
      },
    }),
  ])

  return [serializeChatMessage(question), serializeChatMessage(answer)]
}
