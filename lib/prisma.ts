import { PrismaClient } from '@prisma/client'
// Relative, not aliased: the `auth` CLI and seed scripts load this outside Nuxt.
import { tenantUserId } from './tenant-context'

const databaseUrl = () => {
  const fromEnv = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL
  if (fromEnv) return fromEnv
  try {
    const url = useRuntimeConfig().databaseUrl
    if (typeof url === 'string' && url) return url
  } catch {
    // Seed scripts and other non-Nuxt callers only have process.env.
  }
  return undefined
}

const prismaClientSingleton = () => {
  const url = databaseUrl()
  return new PrismaClient(url ? { datasourceUrl: url } : undefined)
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined
  prismaClientVersion: number | undefined
  prismaDatabaseUrl: string | undefined
} & typeof global

// Bump when models are added so a stale HMR client is not reused.
const PRISMA_CLIENT_VERSION = 30

const currentUrl = databaseUrl()

/**
 * Unrestricted client (connects as the owning role, so RLS does not apply).
 * Use for Better Auth, webhooks, seeds — never for request data directly.
 */
export const systemPrisma =
  globalThis.prismaClientVersion === PRISMA_CLIENT_VERSION &&
  globalThis.prismaDatabaseUrl === currentUrl &&
  globalThis.prismaGlobal
    ? globalThis.prismaGlobal
    : prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = systemPrisma
  globalThis.prismaClientVersion = PRISMA_CLIENT_VERSION
  globalThis.prismaDatabaseUrl = currentUrl
}

/** Role created in the `tenant_rls` migration; policies apply to it only. */
const TENANT_ROLE = 'app_tenant'

type QueryOp = { model: string; method: string; args: unknown[] }

const TENANT_OP = Symbol('tenantOp')

const enterTenant = (client: Pick<PrismaClient, '$executeRaw'>, userId: string) =>
  client.$executeRaw`SELECT set_config('role', ${TENANT_ROLE}, true), set_config('app.user_id', ${userId}, true)`

const delegate = (model: string) =>
  (systemPrisma as unknown as Record<string, Record<string, (...args: unknown[]) => unknown>>)[model]!

/** Runs ops in one transaction whose first statement drops to the tenant role. */
const runTenantOps = async (userId: string, ops: QueryOp[], options?: unknown) => {
  const results = await systemPrisma.$transaction(
    [
      enterTenant(systemPrisma, userId),
      ...ops.map((op) => delegate(op.model)[op.method]!(...op.args) as any),
    ],
    options as any,
  )
  return results.slice(1)
}

/**
 * Lazy like a PrismaPromise: nothing runs until awaited, so it can also be
 * collected into `prisma.$transaction([...])`.
 */
class TenantQuery<T> implements PromiseLike<T> {
  readonly [TENANT_OP]: QueryOp
  private promise: Promise<T> | undefined

  constructor(
    op: QueryOp,
    private readonly userId: string,
  ) {
    this[TENANT_OP] = op
  }

  private run() {
    this.promise ??= runTenantOps(this.userId, [this[TENANT_OP]]).then(
      ([result]) => result as T,
    )
    return this.promise
  }

  then<A = T, B = never>(
    onFulfilled?: ((value: T) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ) {
    return this.run().then(onFulfilled, onRejected)
  }

  catch<B = never>(onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null) {
    return this.run().catch(onRejected)
  }

  finally(onFinally?: (() => void) | null) {
    return this.run().finally(onFinally)
  }

  get [Symbol.toStringTag]() {
    return 'PrismaPromise'
  }
}

const tenantTransaction = (input: unknown, options?: unknown) => {
  const userId = tenantUserId()
  if (!userId) return (systemPrisma.$transaction as any)(input, options)

  if (typeof input === 'function') {
    return systemPrisma.$transaction(async (tx) => {
      await enterTenant(tx, userId)
      return input(tx)
    }, options as any)
  }

  const ops = (input as unknown[]).map((item) => {
    const op = (item as TenantQuery<unknown> | undefined)?.[TENANT_OP]
    if (!op) {
      throw new Error('prisma.$transaction([...]) only accepts model queries inside a request.')
    }
    return op
  })
  return runTenantOps(userId, ops, options)
}

const delegateProxies = new Map<string, unknown>()

const tenantDelegate = (model: string) => {
  const cached = delegateProxies.get(model)
  if (cached) return cached
  const proxy = new Proxy(delegate(model), {
    get(target, method) {
      const value = Reflect.get(target, method)
      if (typeof method !== 'string' || typeof value !== 'function') return value
      return (...args: unknown[]) => {
        const userId = tenantUserId()
        if (!userId) return value.apply(target, args)
        return new TenantQuery({ model, method, args }, userId)
      }
    },
  })
  delegateProxies.set(model, proxy)
  return proxy
}

/**
 * Default client. Inside `runAsTenant` (every `defineApi` handler) each query
 * runs as `app_tenant` with `app.user_id` set, so Postgres RLS hides other
 * workspaces even if a `where` is missing. Outside it behaves as `systemPrisma`.
 */
const prisma = new Proxy(systemPrisma, {
  get(target, prop) {
    if (prop === '$transaction') return tenantTransaction
    const value = Reflect.get(target, prop)
    if (typeof prop === 'string' && !prop.startsWith('$') && !prop.startsWith('_')) {
      if (value && typeof value === 'object' && 'findMany' in value) return tenantDelegate(prop)
    }
    return typeof value === 'function' ? value.bind(target) : value
  },
}) as PrismaClient

export default prisma
