import prisma from '~/lib/prisma'
import { personSelect, serializeMember } from '~/server/utils/person'

export const listWorkspaceMembers = async (workspaceId: string) => {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { createdBy: true }
  })

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: personSelect } }
  })

  const people = members.map((member) =>
    serializeMember(member.user, {
      role: member.userId === workspace.createdBy ? 'OWNER' : member.role,
    })
  )

  // Older workspaces may have a creator who was never inserted as a member row.
  if (!people.some((person) => person.id === workspace.createdBy)) {
    const creator = await prisma.user.findUnique({
      where: { id: workspace.createdBy },
      select: personSelect
    })
    if (creator) {
      people.unshift(serializeMember(creator, { role: 'OWNER' }))
    }
  }

  return people
}

export const listProjectMembers = async (projectId: string) => {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { createdBy: true }
  })

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: personSelect } }
  })

  return members.map((member) =>
    serializeMember(member.user, {
      role: member.userId === project.createdBy ? 'OWNER' : member.role,
    })
  )
}

const findUserByEmail = async (email: string) => {
  const trimmed = email.trim()
  if (!trimmed) return null
  return prisma.user.findFirst({
    where: {
      OR: [{ email: trimmed }, { email: trimmed.toLowerCase() }]
    }
  })
}

export const addWorkspaceMember = async (
  workspaceId: string,
  userId: string,
  role = 'MEMBER'
) => {
  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } }
  })
  if (existing) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: personSelect
    })
    return {
      member: serializeMember(user, { role: existing.role }),
      alreadyMember: true
    }
  }

  await prisma.workspaceMember.create({
    data: { userId, workspaceId, role }
  })

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: personSelect
  })
  return {
    member: serializeMember(user, { role }),
    alreadyMember: false
  }
}

export const addWorkspaceMemberByEmail = async (workspaceId: string, email: string) => {
  const invitee = await findUserByEmail(email)
  if (!invitee) {
    throw createError({
      statusCode: 404,
      message: 'No account with that email. They need to sign up first.'
    })
  }

  const { member, alreadyMember } = await addWorkspaceMember(workspaceId, invitee.id)
  if (alreadyMember) {
    throw createError({
      statusCode: 409,
      message: 'That person is already a workspace member.'
    })
  }
  return member
}

export const removeWorkspaceMember = async (
  workspaceId: string,
  targetUserId: string
) => {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId }
  })
  if (workspace.createdBy === targetUserId) {
    throw createError({
      statusCode: 400,
      message: 'You cannot remove the workspace owner.'
    })
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: { id: true }
  })
  const projectIds = projects.map((project) => project.id)

  await prisma.$transaction([
    prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId: targetUserId }
    }),
    ...(projectIds.length
      ? [
          prisma.projectMember.deleteMany({
            where: { userId: targetUserId, projectId: { in: projectIds } }
          }),
          prisma.taskMember.deleteMany({
            where: {
              userId: targetUserId,
              task: { projectId: { in: projectIds } }
            }
          })
        ]
      : [])
  ])
}

export const addProjectMember = async (projectId: string, userId: string) => {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId }
  })

  const inWorkspace = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId: project.workspaceId }
    }
  })
  if (!inWorkspace && project.createdBy !== userId) {
    throw createError({
      statusCode: 400,
      message: 'That person must be a workspace member first.'
    })
  }

  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } }
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'That person is already a project member.'
    })
  }

  await prisma.projectMember.create({
    data: {
      userId,
      projectId,
      role: userId === project.createdBy ? 'OWNER' : 'MEMBER'
    }
  })

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: personSelect
  })
  return serializeMember(user, {
    role: userId === project.createdBy ? 'OWNER' : 'MEMBER',
  })
}

export const removeProjectMember = async (projectId: string, targetUserId: string) => {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId }
  })
  if (project.createdBy === targetUserId) {
    throw createError({
      statusCode: 400,
      message: 'You cannot remove the project owner.'
    })
  }

  await prisma.$transaction([
    prisma.projectMember.deleteMany({
      where: { projectId, userId: targetUserId }
    }),
    prisma.taskMember.deleteMany({
      where: { userId: targetUserId, task: { projectId } }
    })
  ])
}
