import { defineStore } from 'pinia'
import type { Member, Workspace } from '~/types'

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

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    members,
    loading,
    fetchWorkspaces,
    setActiveWorkspace,
    fetchMembers,
    addMember,
    createInvite,
    removeMember,
    getActiveWorkspace,
    getSortedWorkspaces
  }
})
