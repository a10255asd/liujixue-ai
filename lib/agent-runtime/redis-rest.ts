import { z } from 'zod'

export type RedisRestConfig = {
  url: string
  token: string
}

const redisResponseSchema = z.object({
  result: z.unknown().optional(),
  error: z.string().optional()
})

export function resolveRedisRestConfig(env: Readonly<Record<string, string | undefined>> = process.env): RedisRestConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

export function createRedisRestClient(config: RedisRestConfig, fetchImpl: typeof fetch = fetch) {
  return {
    async command<T>(...command: Array<string | number>): Promise<T> {
      const response = await fetchImpl(config.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(command),
        cache: 'no-store'
      })
      if (!response.ok) throw new Error(`Redis REST 返回 ${response.status}`)
      const parsed = redisResponseSchema.parse(await response.json())
      if (parsed.error) throw new Error(`Redis REST：${parsed.error}`)
      return parsed.result as T
    }
  }
}

export type RedisRestClient = ReturnType<typeof createRedisRestClient>
