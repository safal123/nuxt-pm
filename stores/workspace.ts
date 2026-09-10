import { defineStore } from 'pinia'
import type { ArchivedList, Member, Project, Task, Workspace, WorkspaceSetting } from '~/types'
import { api } from '~/lib/api'
import { CACHE_TTL, invalidateWorkspacePages, isFresh, type FetchOptions } from '~/lib/query'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([])
  const activeWorkspaceId = ref<string | null>(null)
  const activeWorkspace = ref<Workspace | null>(null)
  const members = ref<Member[]>([])
  const loading = ref(false)
  const archiveLoading = ref(false)
  const archivedLists = ref<ArchivedList[]>([])
  const archivedCards = ref<(Task & { projectName?: string })[]>([])
  const archivedProjects = ref<Project[]>([])

  const workspacesFetchedAt = ref<number | null>(null)
  const membersWorkspaceId = ref<string | null>(null)
  const membersFetchedAt = ref<number | null>(null)
  const archiveWorkspaceId = ref<string | null>(null)
  const archiveFetchedAt = ref<number | null>(null)

  let workspacesInflight: Promise<Workspace[]> | null = null
  const membersInflight = new Map<string, Promise<void>>()
  const archiveInflight = new Map<string, Promise<void>>()

  const getActiveWorkspace = computed(() =>
    workspaces.value.find(w => w.id === activeWorkspaceId.value)
  )

  const getSortedWorkspaces = computed(() =>
    [...workspaces.value].sort((a, b) =>
      new Date(b?.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )

  const fetchWorkspaces = async (options?: FetchOptions) => {
    if (
      !options?.force &&
      workspacesFetchedAt.value &&
      isFresh(workspacesFetchedAt.value, CACHE_TTL.workspaces)
    ) {
      return workspaces.value
    }
    if (workspacesInflight && !options?.force) return workspacesInflight

    workspacesInflight = (async () => {
      loading.value = true
      try {
        const { workspaces: next } = await api<{ workspaces: Workspace[] }>('/api/workspaces')
        const user = useUserStore().user
        workspaces.value = next ?? []
        activeWorkspaceId.value =
          user?.activeWorkspaceId ?? workspaces.value[0]?.id ?? null
        activeWorkspace.value = workspaces.value.find(w => w.id === activeWorkspaceId.value) || null
        workspacesFetchedAt.value = Date.now()
        if (activeWorkspaceId.value) await fetchMembers(activeWorkspaceId.value)
        return workspaces.value
      } finally {
        loading.value = false
        workspacesInflight = null
      }
    })()

    return workspacesInflight
  }

  const createWorkspace = async (payload: { name: string; description?: string | null }) => {
    const { workspace } = await api<{ workspace: Workspace }>('/api/workspaces', {
      method: 'POST',
      body: payload,
    })
    await fetchWorkspaces({ force: true })
    invalidateWorkspacePages(workspace.id)
    return workspace
  }

  const createProject = async (payload: {
    workspaceId: string
    name: string
    description?: string | null
  }) => {
    const { project } = await api<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: payload,
    })
    for (const workspace of workspaces.value) {
      if (workspace.id !== payload.workspaceId) continue
      workspace.projects = [...(workspace.projects || []), project]
    }
    if (activeWorkspace.value?.id === payload.workspaceId) {
      activeWorkspace.value = {
        ...activeWorkspace.value,
        projects: [...(activeWorkspace.value.projects || []), project],
      }
    }
    invalidateWorkspacePages(payload.workspaceId)
    return project
  }

  const setActiveWorkspace = async (workspaceId: string) => {
    activeWorkspaceId.value = workspaceId
    activeWorkspace.value = workspaces.value.find(w => w.id === workspaceId) || null
    await fetchMembers(workspaceId)
  }

  const fetchMembers = async (workspaceId: string, options?: FetchOptions) => {
    if (
      !options?.force &&
      membersWorkspaceId.value === workspaceId &&
      membersFetchedAt.value &&
      isFresh(membersFetchedAt.value, CACHE_TTL.members)
    ) {
      return
    }

    const pending = membersInflight.get(workspaceId)
    if (pending && !options?.force) return pending

    const request = (async () => {
      const { members: next } = await api<{ members: Member[] }>(
        `/api/workspaces/${workspaceId}/members`,
      )
      members.value = next ?? []
      membersWorkspaceId.value = workspaceId
      membersFetchedAt.value = Date.now()
    })()

    membersInflight.set(workspaceId, request)
    try {
      await request
    } finally {
      membersInflight.delete(workspaceId)
    }
  }

  const addMember = async (email: string) => {
    if (!activeWorkspaceId.value) return null
    const { member } = await api<{ member: Member }>(
      `/api/workspaces/${activeWorkspaceId.value}/members`,
      { method: 'POST', body: { email } },
    )
    if (member && !members.value.some((item) => item.id === member.id)) {
      members.value.push(member)
    }
    membersFetchedAt.value = Date.now()
    invalidateWorkspacePages(activeWorkspaceId.value)
    return member
  }

  const createInvite = async (email?: string) => {
    if (!activeWorkspaceId.value) return null
    const { invite } = await api<{
      invite: { url: string; expiresAt: string; email: string | null; emailed?: boolean }
    }>(`/api/workspaces/${activeWorkspaceId.value}/invites`, {
      method: 'POST',
      body: email ? { email } : {},
    })
    return invite ?? null
  }

  const removeMember = async (userId: string) => {
    if (!activeWorkspaceId.value) return
    await api(`/api/workspaces/${activeWorkspaceId.value}/members/${userId}`, {
      method: 'DELETE',
    })
    members.value = members.value.filter((member) => member.id !== userId)
    membersFetchedAt.value = Date.now()
    invalidateWorkspacePages(activeWorkspaceId.value)
  }

  const applyProjectUpdate = (project: Project) => {
    for (const workspace of workspaces.value) {
      if (!workspace.projects) continue
      workspace.projects = workspace.projects.map((item) =>
        item.id === project.id ? { ...item, ...project } : item
      )
    }
    if (activeWorkspace.value?.projects) {
      activeWorkspace.value = {
        ...activeWorkspace.value,
        projects: activeWorkspace.value.projects.map((item) =>
          item.id === project.id ? { ...item, ...project } : item
        )
      }
    }

    if (project.archivedAt) {
      const without = archivedProjects.value.filter((item) => item.id !== project.id)
      archivedProjects.value = [project, ...without]
    } else {
      archivedProjects.value = archivedProjects.value.filter((item) => item.id !== project.id)
    }
  }

  const updateProject = async (
    projectId: string,
    payload: { name?: string; description?: string | null; archived?: boolean }
  ) => {
    const { project } = await api<{ project: Project }>(
      `/api/projects/${projectId}`,
      { method: 'PATCH', body: payload },
    )
    if (project) applyProjectUpdate(project)
    if (payload.archived !== undefined) {
      await fetchArchive({ silent: true, force: true })
    }
    invalidateWorkspacePages(activeWorkspaceId.value)
    return project ?? null
  }

  const fetchArchive = async (options?: FetchOptions & { silent?: boolean }) => {
    if (!activeWorkspaceId.value) return
    const workspaceId = activeWorkspaceId.value
    if (
      !options?.force &&
      archiveWorkspaceId.value === workspaceId &&
      archiveFetchedAt.value &&
      isFresh(archiveFetchedAt.value, CACHE_TTL.archive)
    ) {
      return
    }

    const pending = archiveInflight.get(workspaceId)
    if (pending && !options?.force) return pending

    const request = (async () => {
      if (!options?.silent) archiveLoading.value = true
      try {
        const result = await api<{
          lists: ArchivedList[]
          cards: (Task & { projectName?: string })[]
          projects: Project[]
        }>(`/api/workspaces/${workspaceId}/archived`)
        archivedLists.value = result.lists ?? []
        archivedCards.value = result.cards ?? []
        archivedProjects.value = result.projects ?? []
        archiveWorkspaceId.value = workspaceId
        archiveFetchedAt.value = Date.now()
      } finally {
        archiveLoading.value = false
      }
    })()

    archiveInflight.set(workspaceId, request)
    try {
      await request
    } finally {
      archiveInflight.delete(workspaceId)
    }
  }

  const restoreList = async (columnId: string) => {
    await api(`/api/columns/${columnId}`, {
      method: 'PATCH',
      body: { archived: false },
    })
    archivedLists.value = archivedLists.value.filter((item) => item.id !== columnId)
    archiveFetchedAt.value = Date.now()
    const board = useBoardStore()
    if (board.projectId) await board.fetchBoard(board.projectId, { force: true })
    invalidateWorkspacePages(activeWorkspaceId.value)
  }

  const deleteArchivedList = async (columnId: string) => {
    await api(`/api/columns/${columnId}`, { method: 'DELETE' })
    archivedLists.value = archivedLists.value.filter((item) => item.id !== columnId)
    archiveFetchedAt.value = Date.now()
    invalidateWorkspacePages(activeWorkspaceId.value)
  }

  const deleteArchivedCard = async (taskId: string) => {
    await api(`/api/tasks/${taskId}`, { method: 'DELETE' })
    archivedCards.value = archivedCards.value.filter((item) => item.id !== taskId)
    archiveFetchedAt.value = Date.now()
    invalidateWorkspacePages(activeWorkspaceId.value)
  }

  const deleteArchivedProject = async (projectId: string) => {
    await api(`/api/projects/${projectId}`, { method: 'DELETE' })
    archivedProjects.value = archivedProjects.value.filter((item) => item.id !== projectId)
    archiveFetchedAt.value = Date.now()
    for (const workspace of workspaces.value) {
      if (!workspace.projects) continue
      workspace.projects = workspace.projects.filter((item) => item.id !== projectId)
    }
    if (activeWorkspace.value?.projects) {
      activeWorkspace.value = {
        ...activeWorkspace.value,
        projects: activeWorkspace.value.projects.filter((item) => item.id !== projectId)
      }
    }
    invalidateWorkspacePages(activeWorkspaceId.value)
  }

  const applySettings = (workspaceId: string, settings: WorkspaceSetting) => {
    workspaces.value = workspaces.value.map((workspace) =>
      workspace.id === workspaceId ? { ...workspace, settings } : workspace
    )
    if (activeWorkspace.value?.id === workspaceId) {
      activeWorkspace.value = { ...activeWorkspace.value, settings }
    }
  }

  const updateSettings = async (patch: Partial<WorkspaceSetting>) => {
    if (!activeWorkspaceId.value) return
    const workspaceId = activeWorkspaceId.value
    const previous = activeWorkspace.value?.settings
    applySettings(workspaceId, {
      emailOnInvite: true,
      emailOnProjectAdd: true,
      weekStartsOnMonday: true,
      backgroundColor: null,
      ...previous,
      ...patch,
    })
    try {
      const { settings } = await api<{ settings: WorkspaceSetting }>(
        `/api/workspaces/${workspaceId}/settings`,
        { method: 'PATCH', body: patch },
      )
      if (settings) applySettings(workspaceId, settings)
    } catch (error) {
      if (previous) applySettings(workspaceId, previous)
      throw error
    }
  }

  const reset = () => {
    workspaces.value = []
    activeWorkspaceId.value = null
    activeWorkspace.value = null
    members.value = []
    archivedLists.value = []
    archivedCards.value = []
    archivedProjects.value = []
    workspacesFetchedAt.value = null
    membersWorkspaceId.value = null
    membersFetchedAt.value = null
    archiveWorkspaceId.value = null
    archiveFetchedAt.value = null
    workspacesInflight = null
    membersInflight.clear()
    archiveInflight.clear()
  }

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    members,
    loading,
    archiveLoading,
    archivedLists,
    archivedCards,
    archivedProjects,
    fetchWorkspaces,
    createWorkspace,
    createProject,
    setActiveWorkspace,
    fetchMembers,
    addMember,
    createInvite,
    removeMember,
    updateProject,
    updateSettings,
    fetchArchive,
    restoreList,
    deleteArchivedList,
    deleteArchivedCard,
    deleteArchivedProject,
    getActiveWorkspace,
    getSortedWorkspaces,
    reset,
  }
})
