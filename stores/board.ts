import { defineStore } from 'pinia'
import type { Task, TaskColumn } from '~/types'

interface BoardResponse {
  data: { columns: TaskColumn[] }
  message?: string
}

interface TaskResponse {
  data: { task: Task }
  message?: string
}

interface LikeResponse {
  data: { liked: boolean; likeCount: number }
  message?: string
}

export const useBoardStore = defineStore('board', () => {
  const projectId = ref<string | null>(null)
  const columns = ref<TaskColumn[]>([])
  const loading = ref(false)

  const draggingTask = ref<Task | null>(null)
  const dragSize = ref({ width: 0, height: 0 })
  const originColumnId = ref<string | null>(null)
  const originIndex = ref(0)

  const findTaskLocation = (taskId: string) => {
    for (const column of columns.value) {
      const index = column.tasks.findIndex((t) => t.id === taskId)
      if (index !== -1) return { column, index }
    }
    return null
  }

  const arrayMove = <T>(list: T[], from: number, to: number) => {
    if (from === to) return
    const [item] = list.splice(from, 1)
    list.splice(to, 0, item)
  }

  const reindex = (column: TaskColumn) => {
    column.tasks.forEach((item, order) => {
      item.order = order
    })
  }

  /**
   * Moves the dragged task to `columnId` at `index` in the live board.
   * `index` is the position in that column's current array (including the
   * dragged task if it is already in this column).
   */
  const moveDraggingTo = (columnId: string, index: number) => {
    const task = draggingTask.value
    if (!task) return

    const from = findTaskLocation(task.id)
    if (!from) return

    const toColumn = columns.value.find((c) => c.id === columnId)
    if (!toColumn) return

    if (from.column.id === toColumn.id) {
      const clamped = Math.max(0, Math.min(index, toColumn.tasks.length - 1))
      if (from.index === clamped) return
      arrayMove(toColumn.tasks, from.index, clamped)
      reindex(toColumn)
      return
    }

    const [moved] = from.column.tasks.splice(from.index, 1)
    moved.columnId = columnId
    const clamped = Math.max(0, Math.min(index, toColumn.tasks.length))
    toColumn.tasks.splice(clamped, 0, moved)
    reindex(from.column)
    reindex(toColumn)
  }

  const findTask = (taskId: string) => {
    for (const column of columns.value) {
      const task = column.tasks.find((t) => t.id === taskId)
      if (task) return task
    }
    return undefined
  }

  const fetchBoard = async (id: string) => {
    loading.value = true
    projectId.value = id
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const { data } = await useFetch<BoardResponse>(`/api/projects/${id}/board`, { headers })
      columns.value = data.value?.data.columns ?? []
      await Promise.all([fetchLabels(id), fetchProjectMembers(id)])
    } catch (error) {
      console.error('Failed to fetch board:', error)
    } finally {
      loading.value = false
    }
  }

  const addTask = async (columnId: string, title: string) => {
    if (!projectId.value) return
    try {
      const { data } = await useFetch<TaskResponse>(`/api/projects/${projectId.value}/tasks`, {
        method: 'POST',
        body: { columnId, title }
      })
      const task = data.value?.data.task
      const column = columns.value.find((c) => c.id === columnId)
      if (task && column) {
        column.tasks.push({ ...task, labels: task.labels || [] })
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const startDrag = (task: Task, size: { width: number; height: number }) => {
    const location = findTaskLocation(task.id)
    draggingTask.value = task
    dragSize.value = size
    originColumnId.value = location?.column.id ?? task.columnId
    originIndex.value = location?.index ?? 0
  }

  const cancelDrag = () => {
    if (!draggingTask.value || !originColumnId.value) return
    moveDraggingTo(originColumnId.value, originIndex.value)
  }

  const commitDrag = async () => {
    const task = draggingTask.value
    if (!task) return

    const location = findTaskLocation(task.id)
    if (!location) return

    const unchanged =
      location.column.id === originColumnId.value &&
      location.index === originIndex.value
    if (unchanged) return

    try {
      await $fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: { columnId: location.column.id, order: location.index }
      })
    } catch (error) {
      console.error('Failed to move task:', error)
      cancelDrag()
    }
  }

  const selectedTask = ref<Task | null>(null)
  const selectedTaskLoading = ref(false)
  const workspaceMembers = ref<Task['members']>([])
  const projectMembers = ref<Task['members']>([])
  const projectLabels = ref<Task['labels']>([])

  const patchTask = async (taskId: string, body: Record<string, unknown>) => {
    const task = findTask(taskId)
    const result = await $fetch<TaskResponse>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body
    })
    const updated = result?.data?.task
    if (updated && task) {
      Object.assign(task, updated)
    }
    if (updated && selectedTask.value?.id === taskId) {
      selectedTask.value = { ...selectedTask.value, ...updated }
    }
    return updated
  }

  const openTask = async (task: Task) => {
    selectedTask.value = { ...task, comments: task.comments ?? [] }
    selectedTaskLoading.value = true
    try {
      const result = await $fetch<TaskResponse>(`/api/tasks/${task.id}`)
      if (result?.data?.task) {
        selectedTask.value = result.data.task
        const boardTask = findTask(task.id)
        if (boardTask) Object.assign(boardTask, result.data.task)
      }
    } catch (error) {
      console.error('Failed to load task:', error)
    } finally {
      selectedTaskLoading.value = false
    }
  }

  const closeTask = () => {
    selectedTask.value = null
  }

  const endDrag = () => {
    draggingTask.value = null
    originColumnId.value = null
    originIndex.value = 0
  }

  const fetchWorkspaceMembers = async (workspaceId: string) => {
    try {
      const result = await $fetch<{ data: { members: Task['members'] } }>(
        `/api/workspaces/${workspaceId}/members`
      )
      workspaceMembers.value = result?.data?.members ?? []
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const fetchProjectMembers = async (id: string) => {
    try {
      const result = await $fetch<{ data: { members: Task['members'] } }>(
        `/api/projects/${id}/members`
      )
      projectMembers.value = result?.data?.members ?? []
    } catch (error) {
      console.error('Failed to load project members:', error)
    }
  }

  const fetchLabels = async (id: string) => {
    try {
      const result = await $fetch<{ data: { labels: Task['labels'] } }>(
        `/api/projects/${id}/labels`
      )
      projectLabels.value = result?.data?.labels ?? []
    } catch (error) {
      console.error('Failed to load labels:', error)
    }
  }

  const createLabel = async (name: string, color: string, taskId?: string) => {
    if (!projectId.value) return null
    const result = await $fetch<{ data: { label: Task['labels'][number] } }>(
      `/api/projects/${projectId.value}/labels`,
      { method: 'POST', body: { name, color, taskId } }
    )
    const label = result?.data?.label
    if (label) {
      projectLabels.value.push(label)
      if (taskId) {
        const task = findTask(taskId)
        if (task) {
          if (!task.labels) task.labels = []
          if (!task.labels.some((item) => item.id === label.id)) {
            task.labels.push(label)
          }
        }
        if (selectedTask.value?.id === taskId) {
          const current = selectedTask.value.labels || []
          selectedTask.value = {
            ...selectedTask.value,
            labels: current.some((item) => item.id === label.id)
              ? current
              : [...current, label]
          }
        }
      }
    }
    return label
  }

  const addComment = async (taskId: string, content: string) => {
    const result = await $fetch<TaskResponse>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: { content }
    })
    const updated = result?.data?.task
    if (updated) {
      selectedTask.value = updated
      const boardTask = findTask(taskId)
      if (boardTask) Object.assign(boardTask, updated)
    }
    return updated
  }

  const deleteTask = async (taskId: string) => {
    if (selectedTask.value?.id === taskId) {
      selectedTask.value = null
    }
    for (const column of columns.value) {
      const index = column.tasks.findIndex((t) => t.id === taskId)
      if (index !== -1) {
        column.tasks.splice(index, 1)
        break
      }
    }

    try {
      await useFetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const toggleLike = async (taskId: string) => {
    const task = findTask(taskId)
    if (!task) return

    const previous = { likedByMe: task.likedByMe, likeCount: task.likeCount }
    task.likedByMe = !task.likedByMe
    task.likeCount = Math.max(0, task.likeCount + (task.likedByMe ? 1 : -1))

    try {
      const result = await $fetch<LikeResponse>(`/api/tasks/${taskId}/like`, {
        method: 'POST'
      })
      if (result?.data) {
        task.likedByMe = result.data.liked
        task.likeCount = result.data.likeCount
      }
    } catch (error) {
      task.likedByMe = previous.likedByMe
      task.likeCount = previous.likeCount
      console.error('Failed to toggle like:', error)
    }
  }

  const addColumn = async (name: string) => {
    if (!projectId.value) return
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      const result = await $fetch<{ data: { column: TaskColumn } }>(
        `/api/projects/${projectId.value}/columns`,
        { method: 'POST', body: { name: trimmed } }
      )
      const column = result?.data?.column
      if (column) {
        columns.value.push({ ...column, tasks: column.tasks || [] })
      }
    } catch (error) {
      console.error('Failed to create column:', error)
    }
  }

  const renameColumn = async (columnId: string, name: string) => {
    const trimmed = name.trim()
    const column = columns.value.find((item) => item.id === columnId)
    if (!column || !trimmed || trimmed === column.name) return
    const previous = column.name
    column.name = trimmed
    try {
      await $fetch(`/api/columns/${columnId}`, {
        method: 'PATCH',
        body: { name: trimmed }
      })
    } catch (error) {
      column.name = previous
      console.error('Failed to rename column:', error)
    }
  }

  const moveColumn = async (columnId: string, direction: 'left' | 'right') => {
    const index = columns.value.findIndex((item) => item.id === columnId)
    const target = direction === 'left' ? index - 1 : index + 1
    if (index === -1 || target < 0 || target >= columns.value.length) return
    const snapshot = columns.value.map((item) => item.id)
    arrayMove(columns.value, index, target)
    columns.value.forEach((item, order) => {
      item.order = order
    })
    try {
      await $fetch(`/api/columns/${columnId}`, {
        method: 'PATCH',
        body: { direction }
      })
    } catch (error) {
      columns.value.sort(
        (a, b) => snapshot.indexOf(a.id) - snapshot.indexOf(b.id)
      )
      columns.value.forEach((item, order) => {
        item.order = order
      })
      console.error('Failed to move column:', error)
    }
  }

  const setColumnColor = async (columnId: string, color: string | null) => {
    const column = columns.value.find((item) => item.id === columnId)
    if (!column) return
    const previous = column.color ?? null
    column.color = color
    try {
      await $fetch(`/api/columns/${columnId}`, {
        method: 'PATCH',
        body: { color }
      })
    } catch (error) {
      column.color = previous
      console.error('Failed to update column color:', error)
    }
  }

  const archiveColumn = async (columnId: string) => {
    const index = columns.value.findIndex((item) => item.id === columnId)
    if (index === -1) return
    const [removed] = columns.value.splice(index, 1)
    try {
      await $fetch(`/api/columns/${columnId}`, {
        method: 'PATCH',
        body: { archived: true }
      })
    } catch (error) {
      columns.value.splice(index, 0, removed)
      console.error('Failed to archive column:', error)
    }
  }

  return {
    projectId,
    columns,
    loading,
    draggingTask,
    dragSize,
    selectedTask,
    selectedTaskLoading,
    workspaceMembers,
    projectMembers,
    projectLabels,
    fetchBoard,
    addTask,
    addColumn,
    renameColumn,
    moveColumn,
    setColumnColor,
    archiveColumn,
    deleteTask,
    toggleLike,
    startDrag,
    moveDraggingTo,
    cancelDrag,
    commitDrag,
    endDrag,
    openTask,
    closeTask,
    patchTask,
    addComment,
    fetchWorkspaceMembers,
    fetchProjectMembers,
    fetchLabels,
    createLabel
  }
})
