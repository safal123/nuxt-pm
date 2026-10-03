import { useLocalStorage } from '@vueuse/core'

export type ProjectView = 'board' | 'table' | 'calendar'

const PROJECT_VIEWS: ProjectView[] = ['board', 'table', 'calendar']

export const useProjectView = () => {
  const view = useLocalStorage<ProjectView>('project-tasks-view', 'board')

  const setView = (next: string) => {
    if (PROJECT_VIEWS.includes(next as ProjectView)) view.value = next as ProjectView
  }

  return { view, setView }
}
