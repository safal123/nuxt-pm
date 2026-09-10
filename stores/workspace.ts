import { defineStore } from 'pinia'
import type { ArchivedList, Member, Project, Task, Workspace, WorkspaceSetting } from '~/types'
import { api } from '~/lib/api'

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

  const getActiveWorkspace = computed(() =>
    workspaces.value.find(w => w.id === activeWorkspaceId.value)
  )

  const getSortedWorkspaces = computed(() =>
    [...workspaces.value].sort((a, b) =>
      new Date(b?.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )

  const fetchWorkspaces = async () => {
    loading.value = true
    try {
      const { workspaces: next } = await api<{ workspaces: Workspace[] }>('/api/workspaces')
      const user = useUserStore().user
      workspaces.value = next ?? []
      activeWorkspaceId.value =
        user?.activeWorkspaceId ?? workspaces.value[0]?.id ?? null
      activeWorkspace.value = workspaces.value.find(w => w.id === activeWorkspaceId.value) || null
      if (activeWorkspaceId.value) await fetchMembers(activeWorkspaceId.value)
      return workspaces.value
    } finally {
      loading.value = false
    }
  }

  const createWorkspace = async (payload: { name: string; description?: string | null }) => {
    const { workspace } = await api<{ workspace: Workspace }>('/api/workspaces', {
      method: 'POST',
      body: payload,
    })
    await fetchWorkspaces()
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
    await fetchWorkspaces()
    return project
  }

  const setActiveWorkspace = async (workspaceId: string) => {
    activeWorkspaceId.value = workspaceId
    activeWorkspace.value = workspaces.value.find(w => w.id === workspaceId) || null
    await fetchMembers(workspaceId)
  }

  const fetchMembers = async (workspaceId: string) => {
    const { members: next } = await api<{ members: Member[] }>(
      `/api/workspaces/${workspaceId}/members`,
    )
    members.value = next ?? []
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
    if (payload.archived !== undefined) await fetchArchive({ silent: true })
    return project ?? null
  }

  const fetchArchive = async (options?: { silent?: boolean }) => {
    if (!activeWorkspaceId.value) return
    if (!options?.silent) archiveLoading.value = true
    try {
      const result = await api<{
        lists: ArchivedList[]
        cards: (Task & { projectName?: string })[]
        projects: Project[]
      }>(`/api/workspaces/${activeWorkspaceId.value}/archived`)
      archivedLists.value = result.lists ?? []
      archivedCards.value = result.cards ?? []
      archivedProjects.value = result.projects ?? []
    } finally {
      archiveLoading.value = false
    }
  }

  const restoreList = async (columnId: string) => {
    await api(`/api/columns/${columnId}`, {
      method: 'PATCH',
      body: { archived: false },
    })
    archivedLists.value = archivedLists.value.filter((item) => item.id !== columnId)
    const board = useBoardStore()
    if (board.projectId) await board.fetchBoard(board.projectId)
  }

  const deleteArchivedList = async (columnId: string) => {
    await api(`/api/columns/${columnId}`, { method: 'DELETE' })
    archivedLists.value = archivedLists.value.filter((item) => item.id !== columnId)
  }

  const deleteArchivedCard = async (taskId: string) => {
    await api(`/api/tasks/${taskId}`, { method: 'DELETE' })
    archivedCards.value = archivedCards.value.filter((item) => item.id !== taskId)
  }

  const deleteArchivedProject = async (projectId: string) => {
    await api(`/api/projects/${projectId}`, { method: 'DELETE' })
    archivedProjects.value = archivedProjects.value.filter((item) => item.id !== projectId)
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
    getSortedWorkspaces
  }
})
