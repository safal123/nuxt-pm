import { defineStore } from 'pinia'
import { api } from '~/lib/api'
import type { AiChatMessage, TaskSummary } from '~/types'

export const useProjectAiStore = defineStore('project-ai', () => {
  const summariesByProject = ref<Record<string, TaskSummary[]>>({})
  const chatsByProject = ref<Record<string, AiChatMessage[]>>({})
  const canUseAi = ref(false)
  const loading = ref(false)
  const generating = ref(false)
  const replying = ref(false)

  const summariesFor = (projectId: string) => summariesByProject.value[projectId] ?? []
  const chatFor = (projectId: string) => chatsByProject.value[projectId] ?? []

  const fetchProjectAi = async (projectId: string) => {
    loading.value = true
    try {
      const result = await api<{
        summaries: TaskSummary[]
        messages: AiChatMessage[]
        canUseAi: boolean
      }>(`/api/projects/${projectId}/ai`)
      summariesByProject.value[projectId] = result.summaries ?? []
      if (!replying.value) chatsByProject.value[projectId] = result.messages ?? []
      canUseAi.value = result.canUseAi ?? false
    } finally {
      loading.value = false
    }
  }

  const generateSummary = async (projectId: string) => {
    generating.value = true
    try {
      const { summaries, created } = await api<{
        summaries: TaskSummary[]
        created: boolean
      }>(`/api/projects/${projectId}/summary`, { method: 'POST' })
      summariesByProject.value[projectId] = summaries ?? []
      return { created }
    } finally {
      generating.value = false
    }
  }

  const sendMessage = async (projectId: string, content: string) => {
    const previous = chatFor(projectId)
    chatsByProject.value[projectId] = [
      ...previous,
      { role: 'user', content, at: new Date().toISOString() },
    ]
    replying.value = true
    try {
      const { messages } = await api<{ messages: AiChatMessage[] }>(
        `/api/projects/${projectId}/chat`,
        { method: 'POST', body: { content } },
      )
      chatsByProject.value[projectId] = [...previous, ...(messages ?? [])]
      return messages
    } catch (error) {
      chatsByProject.value[projectId] = previous
      throw error
    } finally {
      replying.value = false
    }
  }

  const clearChat = async (projectId: string) => {
    await api(`/api/projects/${projectId}/chat`, { method: 'DELETE' })
    chatsByProject.value[projectId] = []
  }

  return {
    canUseAi,
    loading,
    generating,
    replying,
    summariesFor,
    chatFor,
    fetchProjectAi,
    generateSummary,
    sendMessage,
    clearChat,
  }
})
