import { AsyncLocalStorage } from 'node:async_hooks'

type TenantStore = { userId: string } | { system: true }

const storage = new AsyncLocalStorage<TenantStore>()

/** Queries inside `fn` run under row-level security as this user. */
export const runAsTenant = <T>(userId: string, fn: () => T) => storage.run({ userId }, fn)

/**
 * Queries inside `fn` bypass row-level security. Only for flows that must
 * cross workspaces and already check access themselves (invite accept,
 * billing seat counts, webhooks).
 */
export const runAsSystem = <T>(fn: () => T) => storage.run({ system: true }, fn)

export const tenantUserId = () => {
  const store = storage.getStore()
  return store && 'userId' in store ? store.userId : null
}
