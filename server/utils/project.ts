import type { z } from 'zod'
import prisma from '~/lib/prisma'
import { workspaceAccessWhere, assertCreator } from '~/server/utils/workspace'
import { assertCanCreateProject } from '~/server/utils/billing'
import { createDefaultColumns } from '~/server/utils/column'
import type {
  projectSettingsSchema,
  projectUpdateSchema,
  projectViewSchema,
} from '~/server/utils/schemas'

type ProjectView = z.infer<typeof projectViewSchema>
type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>
type ProjectSettingsInput = z.infer<typeof projectSettingsSchema>

const PROJECT_VIEWS = ['board', 'table', 'calendar'] as const

const asProjectView = (value: string | null | undefined): ProjectView =>
  PROJECT_VIEWS.includes(value as ProjectView) ? (value as ProjectView) : 'board'

export const serializeProjectSettings = (settings?: { defaultView: string } | null) => ({
  defaultView: asProjectView(settings?.defaultView),
})

export const serializeProject = (project: {
  id: string
  name: string
  description: string | null
  workspaceId: string
  createdBy: string
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
  settings?: { defaultView: string } | null
}) => ({
  id: project.id,
  name: project.name,
  description: project.description,
  workspaceId: project.workspaceId,
  createdBy: project.createdBy,
  archivedAt: project.archivedAt,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  settings: serializeProjectSettings(project.settings),
})

const connectProjectSettings = (projectId: string, workspaceId: string) => ({
  project: {
    connect: { id_workspaceId: { id: projectId, workspaceId } },
  },
})

export const ensureProjectSettings = async (projectId: string, workspaceId: string) => {
  return prisma.projectSetting.upsert({
    where: { projectId },
    create: connectProjectSettings(projectId, workspaceId),
    update: {},
  })
}

const withSettings = async <T extends { id: string; workspaceId: string; settings?: { defaultView: string } | null }>(
  project: T,
) => {
  const settings = project.settings ?? await ensureProjectSettings(project.id, project.workspaceId)
  return serializeProject({ ...project, settings })
}

/** 404 unless the user can reach this project through the workspace. */
export const validateProjectAccess = async (projectId: string, userId: string) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: workspaceAccessWhere(userId),
    },
  })

  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'Project not found or you do not have access.',
    })
  }

  return project
}

export const createProject = async (options: {
  workspaceId: string
  name: string
  description?: string | null
  createdBy: string
}) => {
  await assertCanCreateProject(options.workspaceId)
  try {
    const project = await prisma.project.create({
      data: {
        workspaceId: options.workspaceId,
        name: options.name,
        description: options.description || '',
        createdBy: options.createdBy,
        members: {
          create: { userId: options.createdBy, role: 'OWNER' },
        },
        settings: {
          create: {},
        },
      },
      include: { settings: true },
    })
    await createDefaultColumns(project.id, project.workspaceId)
    return serializeProject(project)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({
        statusCode: 409,
        message: 'A project with that name already exists in this workspace.',
      })
    }
    throw error
  }
}

export const updateProject = async (
  existing: { id: string; createdBy: string; workspaceId: string },
  input: ProjectUpdateInput,
  userId: string,
) => {
  if (input.archived === true || input.archived === false) {
    assertCreator(existing.createdBy, userId, 'project')
    const project = await prisma.project.update({
      where: { id: existing.id },
      data: { archivedAt: input.archived ? new Date() : null },
      include: { settings: true },
    })
    return withSettings(project)
  }

  try {
    const project = await prisma.project.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      include: { settings: true },
    })
    return withSettings(project)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({
        statusCode: 409,
        message: 'A project with that name already exists in this workspace.',
      })
    }
    throw error
  }
}

export const updateProjectSettings = async (
  existing: { id: string; workspaceId: string },
  input: ProjectSettingsInput,
) => {
  const settings = await prisma.projectSetting.upsert({
    where: { projectId: existing.id },
    create: {
      ...connectProjectSettings(existing.id, existing.workspaceId),
      defaultView: input.defaultView ?? 'board',
    },
    update: {
      ...(input.defaultView !== undefined ? { defaultView: input.defaultView } : {}),
    },
  })
  return serializeProjectSettings(settings)
}
