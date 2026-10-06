import { useLocalStorage } from '@vueuse/core'
import type { ProjectView } from '~/types'

export type { ProjectView }

const PROJECT_VIEWS: ProjectView[] = ['board', 'table', 'calendar']

/** Toolbar choice is stored per project; the project setting is the fallback. */
export const useProjectView = () => {
  const route = useRoute()
  const boardStore = useBoardStore()
  const workspaceStore = useWorkspaceStore()
  const overrides = useLocalStorage<Record<string, ProjectView>>('project-view-by-id', {})

  const projectId = computed(() =>
    String(route.params.projectId || boardStore.projectId || ''),
  )

  const projectDefault = computed<ProjectView>(() => {
    const project = workspaceStore.activeWorkspace?.projects?.find(
      (item) => item.id === projectId.value,
    )
    const next = project?.settings?.defaultView
    return next && PROJECT_VIEWS.includes(next) ? next : 'board'
  })

  const view = computed({
    get: (): ProjectView => {
      const stored = overrides.value[projectId.value]
      if (stored && PROJECT_VIEWS.includes(stored)) return stored
      return projectDefault.value
    },
    set: (next: ProjectView) => {
      if (!projectId.value || !PROJECT_VIEWS.includes(next)) return
      overrides.value = { ...overrides.value, [projectId.value]: next }
    },
  })

  const setView = (next: string) => {
    if (PROJECT_VIEWS.includes(next as ProjectView)) view.value = next as ProjectView
  }

  const rememberView = (id: string, next: ProjectView) => {
    overrides.value = { ...overrides.value, [id]: next }
  }

  return { view, setView, rememberView }
}
