import { useLocalStorage } from '@vueuse/core'

export type ProjectView = 'board' | 'table'

export const useProjectView = () => {
  const view = useLocalStorage<ProjectView>('project-tasks-view', 'board')

  const setView = (next: string) => {
    if (next === 'board' || next === 'table') view.value = next
  }

  return { view, setView }
}
