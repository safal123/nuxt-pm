import type { Sprint, SprintStatus } from '@prisma/client'
import prisma from '~/lib/prisma'
import type { SprintFilter } from '~/types'
import { resolveSprintFilter, sprintTitle, sprintWhere } from '~/utils/sprints'

export const serializeSprint = (
  sprint: {
    id: string
    name: string
    number: number
    goal: string | null
    status: SprintStatus | string
    plannedStartAt: Date | null
    plannedEndAt: Date | null
    startedAt: Date | null
    completedAt: Date | null
    projectId: string
    createdBy: string
    createdAt: Date
    updatedAt: Date
    _count?: { tasks?: number }
    doneCount?: number
  },
) => ({
  id: sprint.id,
  name: sprint.name,
  number: sprint.number,
  goal: sprint.goal,
  status: sprint.status,
  plannedStartAt: sprint.plannedStartAt,
  plannedEndAt: sprint.plannedEndAt,
  startedAt: sprint.startedAt,
  completedAt: sprint.completedAt,
  projectId: sprint.projectId,
  createdBy: sprint.createdBy,
  createdAt: sprint.createdAt,
  updatedAt: sprint.updatedAt,
  taskCount: sprint._count?.tasks ?? 0,
  doneCount: sprint.doneCount ?? 0,
})

export const findActiveSprint = (projectId: string) =>
  prisma.sprint.findFirst({
    where: { projectId, status: 'ACTIVE' },
  })

export const nextProjectSprintNumber = async (projectId: string) => {
  const last = await prisma.sprint.findFirst({
    where: { projectId },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  return (last?.number ?? 0) + 1
}

export const findOrCreateNextSprint = async (
  projectId: string,
  current: Pick<Sprint, 'number'>,
  createdBy: string,
  workspaceId: string,
) => {
  const planned = await prisma.sprint.findFirst({
    where: {
      projectId,
      status: 'PLANNED',
      number: { gt: current.number },
    },
    orderBy: { number: 'asc' },
  })
  if (planned) return { sprint: planned, created: false }

  const candidate = current.number + 1
  const taken = await prisma.sprint.findUnique({
    where: { projectId_number: { projectId, number: candidate } },
    select: { id: true },
  })
  const number = taken ? await nextProjectSprintNumber(projectId) : candidate

  const sprint = await prisma.sprint.create({
    data: {
      name: sprintTitle(number),
      number,
      status: 'PLANNED',
      projectId,
      workspaceId,
      createdBy,
    },
  })
  return { sprint, created: true }
}

export const validateSprintAccess = async (sprintId: string, projectId: string) => {
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
  })
  if (!sprint) {
    throw createError({ statusCode: 404, message: 'Sprint not found.' })
  }
  return sprint
}

export const assertSameProject = (
  projectId: string,
  related: Array<{ projectId: string } | null | undefined>,
  message = 'Task, sprint, and list must belong to the same project.',
) => {
  if (related.some((item) => item && item.projectId !== projectId)) {
    throw createError({ statusCode: 400, message })
  }
}

export const isClosedSprintStatus = (status: SprintStatus | string) =>
  status === 'COMPLETED' || status === 'CANCELLED'

export const resolveBoardSprintFilter = async (
  projectId: string,
  view: string | undefined,
): Promise<SprintFilter> => {
  const normalized = view?.trim() || 'current'
  const [current, sprintCount] = await Promise.all([
    findActiveSprint(projectId),
    prisma.sprint.count({ where: { projectId } }),
  ])

  if (normalized !== 'current' && normalized !== 'backlog') {
    await validateSprintAccess(normalized, projectId)
  }

  return resolveSprintFilter(normalized, current, sprintCount)
}

export const sprintTaskWhere = (filter: SprintFilter) => sprintWhere(filter)

export const parseOptionalDay = (value: unknown) => {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid date.' })
  }
  return date
}

export const nextOrderInColumnSprint = async (
  columnId: string,
  sprintId: string | null,
) => {
  const last = await prisma.task.findFirst({
    where: { columnId, sprintId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })
  return (last?.order ?? -1) + 1
}
