import { defineStore } from 'pinia'
import type { ArchivedList, Member, Project, Task, Workspace } from '~/types'

interface WorkspacesResponse {
  data: { workspaces: Workspace[] }
  message?: string
}

interface MembersResponse {
  data: { members: Member[] }
  message?: string
}

interface MemberResponse {
  data: { member: Member }
  message?: string
}

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
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const result = await $fetch<WorkspacesResponse>('/api/workspaces', { headers })
      const user = useUserStore().user
      workspaces.value = result?.data.workspaces ?? []
      activeWorkspaceId.value = user?.activeWorkspaceId ?? null
      activeWorkspace.value = workspaces.value.find(w => w.id === activeWorkspaceId.value) || null
      if (activeWorkspaceId.value) await fetchMembers(activeWorkspaceId.value)
      return workspaces.value
    } catch (error) {
      console.error(error)
    } finally {
      loading.value = false
    }
  }

  const setActiveWorkspace = async (workspaceId: string) => {
    activeWorkspaceId.value = workspaceId
    activeWorkspace.value = workspaces.value.find(w => w.id === workspaceId) || null
    await fetchMembers(workspaceId)
  }

  const fetchMembers = async (workspaceId: string) => {
    try {
      const result = await $fetch<MembersResponse>(`/api/workspaces/${workspaceId}/members`)
      members.value = result?.data?.members ?? []
    } catch (error) {
      console.error('Failed to load workspace members:', error)
    }
  }

  const addMember = async (email: string) => {
    if (!activeWorkspaceId.value) return null
    const result = await $fetch<MemberResponse>(
      `/api/workspaces/${activeWorkspaceId.value}/members`,
      { method: 'POST', body: { email } }
    )
    const member = result?.data?.member
    if (member && !members.value.some((item) => item.id === member.id)) {
      members.value.push(member)
    }
    return member
  }

  const createInvite = async (email?: string) => {
    if (!activeWorkspaceId.value) return null
    const result = await $fetch<{
      data: { invite: { url: string; expiresAt: string; email: string | null; emailed?: boolean } }
    }>(`/api/workspaces/${activeWorkspaceId.value}/invites`, {
      method: 'POST',
      body: email ? { email } : {}
    })
    return result?.data?.invite ?? null
  }

  const removeMember = async (userId: string) => {
    if (!activeWorkspaceId.value) return
    await $fetch(`/api/workspaces/${activeWorkspaceId.value}/members/${userId}`, {
      method: 'DELETE'
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
    const result = await $fetch<{ data: { project: Project } }>(
      `/api/projects/${projectId}`,
      { method: 'PATCH', body: payload }
    )
    const project = result?.data?.project
    if (project) applyProjectUpdate(project)
    if (payload.archived !== undefined) await fetchArchive({ silent: true })
    return project ?? null
  }

  const fetchArchive = async (options?: { silent?: boolean }) => {
    if (!activeWorkspaceId.value) return
    if (!options?.silent) archiveLoading.value = true
    try {
      const result = await $fetch<{
        data: {
          lists: ArchivedList[]
          cards: (Task & { projectName?: string })[]
          projects: Project[]
        }
      }>(`/api/workspaces/${activeWorkspaceId.value}/archived`)
      archivedLists.value = result?.data?.lists ?? []
      archivedCards.value = result?.data?.cards ?? []
      archivedProjects.value = result?.data?.projects ?? []
    } catch (error) {
      console.error('Failed to load archive:', error)
    } finally {
      archiveLoading.value = false
    }
  }

  const restoreList = async (columnId: string) => {
    await $fetch(`/api/columns/${columnId}`, {
      method: 'PATCH',
      body: { archived: false }
    })
    archivedLists.value = archivedLists.value.filter((item) => item.id !== columnId)
    const board = useBoardStore()
    if (board.projectId) await board.fetchBoard(board.projectId)
  }

  const deleteArchivedList = async (columnId: string) => {
    await $fetch(`/api/columns/${columnId}`, { method: 'DELETE' })
    archivedLists.value = archivedLists.value.filter((item) => item.id !== columnId)
  }

  const deleteArchivedCard = async (taskId: string) => {
    await $fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    archivedCards.value = archivedCards.value.filter((item) => item.id !== taskId)
  }

  const deleteArchivedProject = async (projectId: string) => {
    await $fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
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
    setActiveWorkspace,
    fetchMembers,
    addMember,
    createInvite,
    removeMember,
    updateProject,
    fetchArchive,
    restoreList,
    deleteArchivedList,
    deleteArchivedCard,
    deleteArchivedProject,
    getActiveWorkspace,
    getSortedWorkspaces
  }
})
