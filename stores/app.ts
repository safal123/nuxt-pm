import { defineStore } from 'pinia'

interface Workspace {
  id: string
  name: string
  description: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface WorkspaceResponse {
  data: { workspaces: Workspace[] }
  message: string
}

export const useAppStore = defineStore('app', () => {
  const workspaces = ref<Workspace[]>([])
  const activeWorkspace = ref<Workspace | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchWorkspaces = async () => {
    const { isSignedIn } = useAuth()
    try {
      if (!isSignedIn) {
        throw new Error('User not authenticated')
      }

      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const { data: workspacesData } = await useFetch<WorkspaceResponse>('/api/workspaces', { headers })
      // get the user from user store
      const user = useUserStore().user
      if (workspacesData.value?.data.workspaces) {
        workspaces.value = workspacesData.value.data.workspaces
        activeWorkspace.value = workspacesData.value.data.workspaces.find(workspace => workspace.id === user?.activeWorkspaceId) || null
      }
    } catch (e) {
      error.value = 'Failed to fetch workspaces'
      console.error('Error fetching workspaces:', e)
    } finally {
      isLoading.value = false
    }
  }

  const setActiveWorkspace = (workspace: Workspace) => {
    activeWorkspace.value = workspace
  }

  return {
    workspaces,
    activeWorkspace,
    isLoading,
    error,
    fetchWorkspaces,
    setActiveWorkspace
  }
})