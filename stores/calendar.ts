import { defineStore } from 'pinia'
import type { CalendarEvent, CalendarEventInput, Task } from '~/types'
import { api } from '~/lib/api'

type CalendarResponse = { events: CalendarEvent[]; tasks: Task[] }

export const useCalendarStore = defineStore('calendar', () => {
  const projectId = ref<string | null>(null)
  const range = ref<{ from: Date; to: Date } | null>(null)
  const events = ref<CalendarEvent[]>([])
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  let requestId = 0

  const fetchRange = async (
    nextProjectId: string,
    from: Date,
    to: Date,
    options?: { silent?: boolean },
  ) => {
    const id = ++requestId
    if (projectId.value !== nextProjectId) {
      events.value = []
      tasks.value = []
    }
    projectId.value = nextProjectId
    range.value = { from, to }
    if (!options?.silent) loading.value = true
    try {
      const data = await api<CalendarResponse>(
        `/api/projects/${nextProjectId}/calendar`,
        { query: { from: from.toISOString(), to: to.toISOString() } },
      )
      if (id !== requestId) return
      events.value = data.events ?? []
      tasks.value = data.tasks ?? []
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  const refresh = async () => {
    if (!projectId.value || !range.value) return
    await fetchRange(projectId.value, range.value.from, range.value.to, { silent: true })
  }

  const upsertEvent = (event: CalendarEvent) => {
    const index = events.value.findIndex((item) => item.id === event.id)
    if (index === -1) events.value.push(event)
    else events.value.splice(index, 1, event)
  }

  const createEvent = async (input: CalendarEventInput) => {
    if (!projectId.value) throw new Error('No project selected')
    const { event } = await api<{ event: CalendarEvent }>(
      `/api/projects/${projectId.value}/events`,
      { method: 'POST', body: input },
    )
    upsertEvent(event)
    return event
  }

  const updateEvent = async (eventId: string, patch: Partial<CalendarEventInput>) => {
    const previous = events.value.find((item) => item.id === eventId)
    if (previous) upsertEvent({ ...previous, ...patch } as CalendarEvent)
    try {
      const { event } = await api<{ event: CalendarEvent }>(`/api/events/${eventId}`, {
        method: 'PATCH',
        body: patch,
      })
      upsertEvent(event)
      return event
    } catch (error) {
      if (previous) upsertEvent(previous)
      throw error
    }
  }

  const deleteEvent = async (eventId: string) => {
    await api(`/api/events/${eventId}`, { method: 'DELETE' })
    events.value = events.value.filter((item) => item.id !== eventId)
  }

  /** Keeps the calendar copy of a card in step with edits made elsewhere. */
  const syncTask = (task: Task) => {
    const index = tasks.value.findIndex((item) => item.id === task.id)
    if (index === -1) return
    if (!task.dueDate || task.archivedAt) tasks.value.splice(index, 1)
    else tasks.value.splice(index, 1, { ...tasks.value[index], ...task })
  }

  /** `dueDate` is a "yyyy-MM-dd" day key. */
  const rescheduleTask = async (taskId: string, dueDate: string) => {
    const index = tasks.value.findIndex((item) => item.id === taskId)
    const previous = index === -1 ? null : tasks.value[index]
    if (previous) tasks.value.splice(index, 1, { ...previous, dueDate })
    try {
      const updated = await useBoardStore().patchTask(taskId, { dueDate })
      if (updated) syncTask(updated)
    } catch (error) {
      if (previous) {
        const current = tasks.value.findIndex((item) => item.id === taskId)
        if (current !== -1) tasks.value.splice(current, 1, previous)
      }
      throw error
    }
  }

  return {
    projectId,
    range,
    events,
    tasks,
    loading,
    fetchRange,
    refresh,
    createEvent,
    updateEvent,
    deleteEvent,
    syncTask,
    rescheduleTask,
  }
})
