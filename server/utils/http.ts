import type { H3Event } from 'h3'
import type { z } from 'zod'
import type { User } from '@prisma/client'
import { validateAndGetUser } from '~/server/utils/user'

type ApiResult<T = unknown> = {
  data: T
  message: string
  status?: number
}

type InferSchema<T> = T extends z.ZodTypeAny ? z.infer<T> : undefined

/**
 * Single handler shape for every route except Better Auth's catch-all.
 *
 * Owns auth, Zod parse, `{ data, message }`, and error normalization so
 * individual routes stay as business logic.
 */
export function defineApi<
  TAuth extends boolean = true,
  TBodySchema extends z.ZodTypeAny | undefined = undefined,
  TQuerySchema extends z.ZodTypeAny | undefined = undefined,
>(options: {
  auth?: TAuth
  body?: TBodySchema
  query?: TQuerySchema
  handler: (ctx: {
    event: H3Event
    user: TAuth extends false ? null : User
    body: InferSchema<TBodySchema>
    query: InferSchema<TQuerySchema>
  }) => Promise<ApiResult>
}) {
  return defineEventHandler(async (event) => {
    try {
      const user =
        options.auth === false ? null : await validateAndGetUser(event)

      let body = undefined as InferSchema<TBodySchema>
      if (options.body) {
        const raw = await readBody(event).catch(() => ({}))
        const parsed = options.body.safeParse(raw ?? {})
        if (!parsed.success) {
          throw createError({
            statusCode: 400,
            message: parsed.error.issues[0]?.message || 'Invalid request body',
          })
        }
        body = parsed.data as InferSchema<TBodySchema>
      }

      let query = undefined as InferSchema<TQuerySchema>
      if (options.query) {
        const parsed = options.query.safeParse(getQuery(event))
        if (!parsed.success) {
          throw createError({
            statusCode: 400,
            message: parsed.error.issues[0]?.message || 'Invalid query',
          })
        }
        query = parsed.data as InferSchema<TQuerySchema>
      }

      const result = await options.handler({
        event,
        user: user as TAuth extends false ? null : User,
        body: body as InferSchema<TBodySchema>,
        query: query as InferSchema<TQuerySchema>,
      })

      if (result.status) {
        setResponseStatus(event, result.status)
      }

      return { data: result.data, message: result.message }
    } catch (error: any) {
      const statusCode = error.statusCode || 500
      if (statusCode >= 500) {
        console.error(error)
      }
      throw createError({
        statusCode,
        message: error.message || 'Internal server error',
      })
    }
  })
}
