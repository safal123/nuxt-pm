import { defineStore } from 'pinia'
import type { Task, TaskColumn } from '~/types'
import { BOARD_COMPLETED_LIMIT } from '~/utils/board'
import { api } from '~/lib/api'
import { realtimeClientId, type BoardRealtimePayload } from '~/utils/realtime'

export const useBoardStore = defineStore('board', () => {
  const projectId = ref<string | null>(null)
  const columns = ref<TaskColumn[]>([])
  const loading = ref(false)

  const draggingTask = ref<Task | null>(null)
  const dragSize = ref({ width: 0, height: 0 })
  const originColumnId = ref<string | null>(null)
  const originIndex = ref(0)
  let dragSnapshot: { id: string; completedCount: number; tasks: Task[] }[] | null =
    null
  let persistId = 0

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

  const bumpCompleted = (column: TaskColumn, fromDone: boolean, toDone: boolean) => {
    if (!fromDone && toDone) {
      column.completedCount = (column.completedCount ?? 0) + 1
    }
    if (fromDone && !toDone) {
      column.completedCount = Math.max(0, (column.completedCount ?? 0) - 1)
    }
  }

  const syncBoardTask = (updated: Task) => {
    const sprintStore = useSprintStore()
    if (updated.archivedAt || !sprintStore.matchesView(updated)) {
      const open = selectedTask.value?.id === updated.id
      removeTaskFromBoard(updated.id)
      if (open) selectedTask.value = { ...updated }
      return
    }

    const location = findTaskLocation(updated.id)
    const wasDone = location?.column.tasks[location.index]?.status === 'DONE'
    const isDone = updated.status === 'DONE'

    if (!location) {
      const column = columns.value.find((item) => item.id === updated.columnId)
      if (!column || updated.status === 'DONE' || updated.archivedAt) return
      insertTaskByOrder(column, updated)
      return
    }

    if (location.column.id !== updated.columnId) {
      const [moved] = location.column.tasks.splice(location.index, 1)
      Object.assign(moved, updated)
      bumpCompleted(location.column, !!wasDone, false)
      const dest = columns.value.find((item) => item.id === updated.columnId)
      if (!dest) return
      insertTaskByOrder(dest, moved)
      bumpCompleted(dest, false, isDone)
      return
    }

    Object.assign(location.column.tasks[location.index], updated)
    bumpCompleted(location.column, !!wasDone, isDone)
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
      const sprint = useSprintStore().boardSprintParam
      const { columns: next } = await api<{ columns: TaskColumn[] }>(
        `/api/projects/${id}/board`,
        { query: { sprint } },
      )
      columns.value = (next ?? []).map((column) => ({
        ...column,
        completedCount: column.completedCount ?? 0,
        tasks: column.tasks ?? []
      }))
      await Promise.all([fetchLabels(id), fetchProjectMembers(id)])
    } finally {
      loading.value = false
    }
  }

  const addTask = async (columnId: string, title: string) => {
    if (!projectId.value) return
    const sprintStore = useSprintStore()
    if (!sprintStore.canAddCards) return
    const { task } = await api<{ task: Task }>(`/api/projects/${projectId.value}/tasks`, {
      method: 'POST',
      body: { columnId, title, sprintId: sprintStore.createSprintId },
    })
    const column = columns.value.find((c) => c.id === columnId)
    if (task && column && sprintStore.matchesView(task)) {
      column.tasks.push({ ...task, labels: task.labels || [] })
    }
  }

  const takeDragSnapshot = () => {
    dragSnapshot = columns.value.map((column) => ({
      id: column.id,
      completedCount: column.completedCount ?? 0,
      tasks: column.tasks.slice(),
    }))
  }

  const restoreDragSnapshot = () => {
    if (!dragSnapshot) return
    for (const column of columns.value) {
      const saved = dragSnapshot.find((item) => item.id === column.id)
      if (!saved) continue
      column.completedCount = saved.completedCount
      column.tasks = saved.tasks.slice()
      for (const task of column.tasks) {
        task.columnId = column.id
      }
      reindex(column)
    }
    dragSnapshot = null
  }

  const startDrag = (task: Task, size: { width: number; height: number }) => {
    persistId += 1
    const location = findTaskLocation(task.id)
    takeDragSnapshot()
    draggingTask.value = task
    dragSize.value = size
    originColumnId.value = location?.column.id ?? task.columnId
    originIndex.value = location?.index ?? 0
  }

  const persistMove = async (taskId: string, columnId: string, order: number) => {
    const id = persistId
    try {
      await api(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: { columnId, order },
      })
      if (id === persistId) dragSnapshot = null
    } catch (error) {
      console.error('Failed to move task:', error)
      if (id === persistId) restoreDragSnapshot()
    }
  }

  const commitDrag = () => {
    const task = draggingTask.value
    if (!task) return

    const location = findTaskLocation(task.id)
    if (!location) {
      endDrag()
      dragSnapshot = null
      return
    }

    const unchanged =
      location.column.id === originColumnId.value &&
      location.index === originIndex.value
    const columnId = location.column.id
    const order = location.index
    const originId = originColumnId.value

    reindex(location.column)
    if (originId && originId !== columnId) {
      const origin = columns.value.find((column) => column.id === originId)
      if (origin) reindex(origin)
    }

    endDrag()

    if (unchanged) {
      dragSnapshot = null
      return
    }

    void persistMove(task.id, columnId, order)
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
    const { task: updated } = await api<{ task: Task }>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body
    })
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

    const { tasks } = await api<{
      tasks: Task[]
      total: number
      page: number
      limit: number
      hasMore: boolean
    }>(`/api/projects/${projectId.value}/tasks`, {
      query: {
        columnId,
        status: 'DONE',
        sprint: useSprintStore().boardSprintParam,
        limit: BOARD_COMPLETED_LIMIT,
        ...(cursor ? { cursor } : {})
      }
    })
    const incoming = (tasks ?? []).filter(
      (task) => !column.tasks.some((item) => item.id === task.id)
    )
    for (const task of incoming) insertTaskByOrder(column, task)
  }

  const openTask = async (task: Task) => {
    selectedTask.value = { ...task, comments: task.comments ?? [] }
    selectedTaskLoading.value = true
    try {
      const { task: next } = await api<{ task: Task }>(`/api/tasks/${task.id}`)
      if (next) {
        selectedTask.value = next
        const boardTask = findTask(task.id)
        if (boardTask) Object.assign(boardTask, next)
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
      const { members } = await api<{ members: Task['members'] }>(
        `/api/workspaces/${workspaceId}/members`
      )
      workspaceMembers.value = members ?? []
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const fetchProjectMembers = async (id: string) => {
    try {
      const { members } = await api<{ members: Task['members'] }>(
        `/api/projects/${id}/members`
      )
      projectMembers.value = members ?? []
    } catch (error) {
      console.error('Failed to load project members:', error)
    }
  }

  const fetchLabels = async (id: string) => {
    try {
      const { labels } = await api<{ labels: Task['labels'] }>(
        `/api/projects/${id}/labels`
      )
      projectLabels.value = labels ?? []
    } catch (error) {
      console.error('Failed to load labels:', error)
    }
  }

  const createLabel = async (name: string, color: string, taskId?: string) => {
    if (!projectId.value) return null
    const { label } = await api<{ label: Task['labels'][number] }>(
      `/api/projects/${projectId.value}/labels`,
      { method: 'POST', body: { name, color, taskId } }
    )
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
    const { task: updated } = await api<{ task: Task }>(`/api/tasks/${taskId}`)
    if (updated) applyUpdatedTask(updated)
    return updated
  }

  const addComment = async (taskId: string, content: string) => {
    const { task: updated } = await api<{ task: Task }>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: { content }
    })
    if (updated) applyUpdatedTask(updated)
    return updated
  }

  const archiveTask = async (taskId: string) => {
    await api(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: { archived: true }
    })
    removeTaskFromBoard(taskId)
  }

  const restoreTask = async (taskId: string) => {
    const { task: updated } = await api<{ task: Task }>(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: { archived: false }
    })
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
      const result = await api<{ liked: boolean; likeCount: number }>(`/api/tasks/${taskId}/like`, {
        method: 'POST'
      })
      if (result) {
        task.likedByMe = result.liked
        task.likeCount = result.likeCount
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
      const { column } = await api<{ column: TaskColumn }>(
        `/api/projects/${projectId.value}/columns`,
        { method: 'POST', body: { name: trimmed } }
      )
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
      await api(`/api/columns/${columnId}`, {
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
      await api(`/api/columns/${columnId}`, {
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
      await api(`/api/columns/${columnId}`, {
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
      await api(`/api/columns/${columnId}`, {
        method: 'PATCH',
        body: { archived: true }
      })
    } catch (error) {
      columns.value.splice(index, 0, removed)
      throw error
    }
  }

  const applyRealtimeEvent = (payload: BoardRealtimePayload) => {
    if (!payload?.type) return
    if (payload.clientId && payload.clientId === realtimeClientId()) return
    if (payload.type === "task.upsert" && draggingTask.value?.id === payload.task.id) {
      return
    }

    if (payload.type === "task.upsert") {
      const existing = findTask(payload.task.id)
      const likedByMe = existing?.likedByMe ?? false
      const next = { ...payload.task, likedByMe }
      syncBoardTask(next)
      for (const label of next.labels || []) {
        if (!projectLabels.value.some((item) => item.id === label.id)) {
          projectLabels.value.push(label)
        }
      }
      if (selectedTask.value?.id === next.id) {
        selectedTask.value = { ...selectedTask.value, ...next, likedByMe }
      }
      return
    }

    if (payload.type === "task.removed") {
      removeTaskFromBoard(payload.taskId)
      return
    }

    if (payload.type === "task.like") {
      const task = findTask(payload.taskId)
      if (task) task.likeCount = payload.likeCount
      if (selectedTask.value?.id === payload.taskId) {
        selectedTask.value = {
          ...selectedTask.value,
          likeCount: payload.likeCount,
        }
      }
      return
    }

    if (payload.type === "column.upsert") {
      const current = columns.value.find((item) => item.id === payload.column.id)
      if (current) {
        current.name = payload.column.name
        current.order = payload.column.order
        current.color = payload.column.color ?? null
        return
      }
      columns.value.push({
        id: payload.column.id,
        name: payload.column.name,
        order: payload.column.order,
        color: payload.column.color ?? null,
        projectId: payload.column.projectId,
        tasks: payload.column.tasks ?? [],
        completedCount: payload.column.completedCount ?? 0,
      })
      columns.value.sort((a, b) => a.order - b.order)
      return
    }

    if (payload.type === "column.removed") {
      columns.value = columns.value.filter((item) => item.id !== payload.columnId)
      return
    }

    if (payload.type === "column.moved") {
      const byId = new Map(columns.value.map((item) => [item.id, item]))
      const next = payload.columnIds
        .map((id) => byId.get(id))
        .filter((item): item is TaskColumn => Boolean(item))
      for (const column of columns.value) {
        if (!payload.columnIds.includes(column.id)) next.push(column)
      }
      next.forEach((column, order) => {
        column.order = order
      })
      columns.value = next
      return
    }

    if (payload.type === "label.created") {
      if (!projectLabels.value.some((item) => item.id === payload.label.id)) {
        projectLabels.value.push(payload.label)
      }
      if (payload.task) {
        const existing = findTask(payload.task.id)
        const likedByMe = existing?.likedByMe ?? false
        syncBoardTask({ ...payload.task, likedByMe })
      }
      return
    }

    if (payload.type === "board.refresh" && projectId.value) {
      if (draggingTask.value) return
      const id = projectId.value
      void useSprintStore().fetchSprints(id).then(() => fetchBoard(id))
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
    createLabel,
    applyRealtimeEvent,
  }
})
