const requestedProjectId = ref<string | null>(null)

export const useProjectRename = () => {
  const requestRename = (projectId: string) => {
    requestedProjectId.value = projectId
  }

  const consumeRename = (projectId: string) => {
    if (requestedProjectId.value !== projectId) return false
    requestedProjectId.value = null
    return true
  }

  return {
    requestedProjectId,
    requestRename,
    consumeRename
  }
}
