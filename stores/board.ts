import { defineStore } from 'pinia'
import type { Task, TaskColumn } from '~/types'
import { BOARD_COMPLETED_LIMIT } from '~/utils/board'

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

interface TasksPageResponse {
  data: {
    tasks: Task[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
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

  const insertTaskByOrder = (column: TaskColumn, task: Task) => {
    const index = column.tasks.findIndex((item) => item.order > task.order)
    if (index === -1) column.tasks.push(task)
    else column.tasks.splice(index, 0, task)
  }

  const syncBoardTask = (updated: Task) => {
    const boardTask = findTask(updated.id)
    const wasDone = boardTask?.status === 'DONE'
    if (boardTask) Object.assign(boardTask, updated)
    const location = findTaskLocation(updated.id)
    if (!location) {
      const column = columns.value.find((item) => item.id === updated.columnId)
      if (!column || updated.status === 'DONE' || updated.archivedAt) return
      insertTaskByOrder(column, updated)
      column.completedCount = Math.max(0, (column.completedCount ?? 0) - 1)
      return
    }
    const isDone = updated.status === 'DONE'
    if (!wasDone && isDone) {
      location.column.completedCount = (location.column.completedCount ?? 0) + 1
    }
    if (wasDone && !isDone) {
      location.column.completedCount = Math.max(
        0,
        (location.column.completedCount ?? 0) - 1
      )
    }
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
    if (moved.status === 'DONE') {
      from.column.completedCount = Math.max(0, (from.column.completedCount ?? 0) - 1)
      toColumn.completedCount = (toColumn.completedCount ?? 0) + 1
    }
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
      const result = await $fetch<BoardResponse>(`/api/projects/${id}/board`, { headers })
      columns.value = (result?.data.columns ?? []).map((column) => ({
        ...column,
        completedCount: column.completedCount ?? 0,
        tasks: column.tasks ?? []
      }))
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
  const listVersion = ref(0)

  const removeTaskFromBoard = (taskId: string) => {
    if (selectedTask.value?.id === taskId) {
      selectedTask.value = null
    }
    for (const column of columns.value) {
      const index = column.tasks.findIndex((t) => t.id === taskId)
      if (index !== -1) {
        if (column.tasks[index].status === 'DONE') {
          column.completedCount = Math.max(0, (column.completedCount ?? 0) - 1)
        }
        column.tasks.splice(index, 1)
        break
      }
    }
    listVersion.value += 1
  }

  const patchTask = async (taskId: string, body: Record<string, unknown>) => {
    const result = await $fetch<TaskResponse>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body
    })
    const updated = result?.data?.task
    if (updated) {
      syncBoardTask(updated)
      if (selectedTask.value?.id === taskId) {
        selectedTask.value = { ...selectedTask.value, ...updated }
      }
    }
    return updated
  }

  const loadMoreCompleted = async (columnId: string) => {
    if (!projectId.value) return
    const column = columns.value.find((item) => item.id === columnId)
    if (!column) return
    const done = column.tasks.filter((task) => task.status === 'DONE')
    if (done.length >= (column.completedCount ?? 0)) return

    const oldestDone = done.reduce((oldest, task) => {
      const taskTime = task.completedAt ? new Date(task.completedAt).getTime() : 0
      const oldestTime = oldest.completedAt
        ? new Date(oldest.completedAt).getTime()
        : 0
      return taskTime < oldestTime ? task : oldest
    }, done[0])
    const cursor = oldestDone
      ? `${oldestDone.completedAt ? new Date(oldestDone.completedAt).toISOString() : ''}::${oldestDone.id}`
      : undefined

    const result = await $fetch<TasksPageResponse>(
      `/api/projects/${projectId.value}/tasks`,
      {
        query: {
          columnId,
          status: 'DONE',
          limit: BOARD_COMPLETED_LIMIT,
          ...(cursor ? { cursor } : {})
        }
      }
    )
    const incoming = (result?.data?.tasks ?? []).filter(
      (task) => !column.tasks.some((item) => item.id === task.id)
    )
    for (const task of incoming) insertTaskByOrder(column, task)
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

  const applyUpdatedTask = (updated: Task) => {
    selectedTask.value = updated
    const boardTask = findTask(updated.id)
    if (boardTask) Object.assign(boardTask, updated)
  }

  const refreshTask = async (taskId: string) => {
    const result = await $fetch<TaskResponse>(`/api/tasks/${taskId}`)
    const updated = result?.data?.task
    if (updated) applyUpdatedTask(updated)
    return updated
  }

  const addComment = async (taskId: string, content: string) => {
    const result = await $fetch<TaskResponse>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: { content }
    })
    const updated = result?.data?.task
    if (updated) applyUpdatedTask(updated)
    return updated
  }

  const archiveTask = async (taskId: string) => {
    await $fetch<TaskResponse>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: { archived: true }
    })
    removeTaskFromBoard(taskId)
  }

  const restoreTask = async (taskId: string) => {
    const result = await $fetch<TaskResponse>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: { archived: false }
    })
    const updated = result?.data?.task
    if (updated && projectId.value) await fetchBoard(projectId.value)
    return updated
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
        columns.value.push({
          ...column,
          tasks: column.tasks || [],
          completedCount: column.completedCount ?? 0
        })
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
      throw error
    }
  }

  return {
    projectId,
    columns,
    listVersion,
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
    archiveTask,
    restoreTask,
    toggleLike,
    startDrag,
    moveDraggingTo,
    cancelDrag,
    commitDrag,
    endDrag,
    openTask,
    closeTask,
    patchTask,
    loadMoreCompleted,
    addComment,
    refreshTask,
    fetchWorkspaceMembers,
    fetchProjectMembers,
    fetchLabels,
    createLabel
  }
})
