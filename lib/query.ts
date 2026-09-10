export const CACHE_TTL = {
  user: 60_000,
  workspaces: 30_000,
  members: 30_000,
  archive: 15_000,
  board: 60_000,
} as const

export type FetchOptions = {
  force?: boolean
}

export const isFresh = (fetchedAt: number | null | undefined, ttl: number) =>
  fetchedAt != null && Date.now() - fetchedAt < ttl

export const pageKeys = {
  summary: (workspaceId: string) => `workspace-summary-${workspaceId || "none"}`,
  activities: (workspaceId: string) => `workspace-activities-${workspaceId || "none"}`,
  emails: (workspaceId: string) => `workspace-emails-${workspaceId || "none"}`,
}

export const invalidateWorkspacePages = (workspaceId?: string | null) => {
  if (!import.meta.client || !workspaceId) return
  try {
    clearNuxtData(
      (key) =>
        key.startsWith(`workspace-summary-${workspaceId}`) ||
        key.startsWith(`workspace-activities-${workspaceId}`) ||
        key.startsWith(`workspace-emails-${workspaceId}`),
    )
    void refreshNuxtData()
  } catch {
    // Pinia actions can run after an await, when no Nuxt instance is active.
  }
}
