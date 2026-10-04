import { defineStore } from 'pinia'
import type {
  CalendarConnection,
  CalendarEvent,
  CalendarEventInput,
  GoogleCalendarStatus,
  GoogleCalendarSummary,
  Task,
} from '~/types'
import { api } from '~/lib/api'

type CalendarResponse = {
  events: CalendarEvent[]
  tasks: Task[]
  connections: CalendarConnection[]
}

export const useCalendarStore = defineStore('calendar', () => {
  const projectId = ref<string | null>(null)
  const range = ref<{ from: Date; to: Date } | null>(null)
  const events = ref<CalendarEvent[]>([])
  const tasks = ref<Task[]>([])
  const connections = ref<CalendarConnection[]>([])
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
      connections.value = []
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
      connections.value = data.connections ?? []
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

  const fetchGoogleStatus = async () => {
    const { status } = await api<{ status: GoogleCalendarStatus }>(
      '/api/integrations/google/status',
    )
    return status
  }

  const fetchGoogleCalendars = async () => {
    const { calendars } = await api<{ calendars: GoogleCalendarSummary[] }>(
      '/api/integrations/google/calendars',
    )
    return calendars
  }

  const upsertConnection = (connection: CalendarConnection) => {
    const index = connections.value.findIndex((item) => item.id === connection.id)
    if (index === -1) connections.value.push(connection)
    else connections.value.splice(index, 1, connection)
  }

  const connectGoogleCalendar = async (input: { calendarId: string; color?: string | null }) => {
    if (!projectId.value) throw new Error('No project selected')
    const { connection } = await api<{ connection: CalendarConnection }>(
      `/api/projects/${projectId.value}/calendar-connections`,
      { method: 'POST', body: input },
    )
    upsertConnection(connection)
    await refresh()
    return connection
  }

  const syncConnection = async (connectionId: string) => {
    const { connection } = await api<{ connection: CalendarConnection }>(
      `/api/calendar-connections/${connectionId}/sync`,
      { method: 'POST' },
    )
    upsertConnection(connection)
    await refresh()
    return connection
  }

  const disconnect = async (connectionId: string) => {
    await api(`/api/calendar-connections/${connectionId}`, { method: 'DELETE' })
    connections.value = connections.value.filter((item) => item.id !== connectionId)
    events.value = events.value.filter((item) => item.connectionId !== connectionId)
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
    connections,
    loading,
    fetchRange,
    refresh,
    createEvent,
    updateEvent,
    deleteEvent,
    syncTask,
    rescheduleTask,
    fetchGoogleStatus,
    fetchGoogleCalendars,
    connectGoogleCalendar,
    syncConnection,
    disconnect,
  }
})
