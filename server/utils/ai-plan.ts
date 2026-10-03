import type { z } from 'zod'
import prisma from '~/lib/prisma'
import { completeChat } from '~/server/utils/ai'
import { aiPlanTaskSchema } from '~/server/utils/schemas'
import { AI_PLAN_MAX_TASKS } from '~/utils/ai-plan'

export type AiPlanTask = z.infer<typeof aiPlanTaskSchema>

const SYSTEM_PROMPT = `You are a senior project manager breaking work into kanban cards.
Turn the user's goal into ${AI_PLAN_MAX_TASKS} or fewer concrete, independently shippable tasks, ordered in the sequence they should be done.

Rules:
- Each title starts with a verb and is under 80 characters ("Design login screen", not "Login").
- Each task is small enough for one person in one to three days. Split anything bigger.
- "summary" is one or two plain sentences on what and why.
- "steps" are 2 to 6 short, actionable checklist items.
- "doneWhen" is one sentence describing how to verify it is finished.
- "priority" is one of LOW, MEDIUM, HIGH, URGENT. Foundations and blockers are HIGH.
- Do not repeat work that already exists on the board.
- No markdown, no numbering inside strings.

Reply with JSON only, exactly this shape:
{"tasks":[{"title":"","summary":"","steps":[""],"doneWhen":"","priority":"MEDIUM"}]}`

const toDescription = (raw: Record<string, unknown>) => {
  const summary = String(raw.summary ?? raw.description ?? '').trim()
  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map((step) => String(step).replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
  const doneWhen = String(raw.doneWhen ?? raw.done_when ?? '').trim()

  return [
    summary,
    steps.length ? `Steps:\n${steps.map((step) => `- ${step}`).join('\n')}` : '',
    doneWhen ? `Done when: ${doneWhen}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export const parseTaskPlan = (text: string): AiPlanTask[] => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced?.[1]?.trim() ?? text.trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return []
  }

  const items = (parsed as { tasks?: unknown })?.tasks
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>
      const result = aiPlanTaskSchema.safeParse({
        title: String(row.title ?? '').slice(0, 120),
        description: toDescription(row),
        priority: String(row.priority ?? 'MEDIUM').toUpperCase(),
      })
      return result.success ? result.data : null
    })
    .filter((task): task is AiPlanTask => task !== null)
    .slice(0, AI_PLAN_MAX_TASKS)
}

export const draftTaskPlan = async (input: {
  projectId: string
  columnId: string
  goal: string
}) => {
  const [project, column, existing] = await Promise.all([
    prisma.project.findUniqueOrThrow({
      where: { id: input.projectId },
      select: { name: true, description: true },
    }),
    prisma.taskColumn.findFirst({
      where: { id: input.columnId, projectId: input.projectId },
      select: { name: true },
    }),
    prisma.task.findMany({
      where: { projectId: input.projectId, archivedAt: null, status: { not: 'DONE' } },
      select: { title: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ])
  if (!column) {
    throw createError({ statusCode: 404, message: 'Column not found.' })
  }

  const prompt = [
    `Project: ${project.name}`,
    project.description ? `Project description: ${project.description}` : null,
    `Tasks will go into the "${column.name}" list.`,
    existing.length
      ? `Already on the board:\n${existing.map((task) => `- ${task.title}`).join('\n')}`
      : 'The board has no open tasks yet.',
    `Goal:\n${input.goal}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const text = await completeChat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.4 },
  )

  const tasks = text ? parseTaskPlan(text) : []
  if (!tasks.length) {
    throw createError({
      statusCode: 502,
      message: 'The AI could not turn that into tasks. Add a bit more detail and try again.',
    })
  }
  return tasks
}
