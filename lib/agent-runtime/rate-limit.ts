import { createHash } from 'node:crypto'

import { createRedisRestClient, resolveRedisRestConfig, type RedisRestClient } from './redis-rest'

export type RuntimeRateLimitMode = 'redis' | 'memory'

export type RuntimeRateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  mode: RuntimeRateLimitMode
}

type MemoryWindow = { count: number; resetAt: number }

const globalRateLimit = globalThis as typeof globalThis & {
  __liujixueAgentRateLimits?: Map<string, MemoryWindow>
}

const memoryWindows = globalRateLimit.__liujixueAgentRateLimits ?? new Map<string, MemoryWindow>()
globalRateLimit.__liujixueAgentRateLimits = memoryWindows

const fixedWindowScript = [
  "local current = redis.call('INCR', KEYS[1])",
  "if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('TTL', KEYS[1])",
  'return {current, ttl}'
].join('\n')

function safeIdentifier(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32)
}

export function getRuntimeClientIdentifier(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const userAgent = request.headers.get('user-agent')?.slice(0, 160) ?? 'unknown-agent'
  return safeIdentifier(`${forwarded ?? realIp ?? 'unknown-ip'}:${userAgent}`)
}

function consumeMemory(key: string, limit: number, windowSeconds: number): RuntimeRateLimitResult {
  const now = Date.now()
  const current = memoryWindows.get(key)
  const window = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowSeconds * 1000 }
    : { count: current.count + 1, resetAt: current.resetAt }
  memoryWindows.set(key, window)

  if (memoryWindows.size > 2_000) {
    for (const [entryKey, entry] of memoryWindows) {
      if (entry.resetAt <= now) memoryWindows.delete(entryKey)
    }
  }

  return {
    allowed: window.count <= limit,
    limit,
    remaining: Math.max(0, limit - window.count),
    resetAt: window.resetAt,
    mode: 'memory'
  }
}

export function createRuntimeRateLimiter(options: {
  redis?: RedisRestClient | null
  env?: NodeJS.ProcessEnv
} = {}) {
  const redisConfig = resolveRedisRestConfig(options.env)
  const redis = options.redis === undefined
    ? (redisConfig ? createRedisRestClient(redisConfig) : null)
    : options.redis

  return {
    mode: (redis ? 'redis' : 'memory') as RuntimeRateLimitMode,
    async consume(input: { identifier: string; limit: number; windowSeconds: number }): Promise<RuntimeRateLimitResult> {
      const bucket = Math.floor(Date.now() / (input.windowSeconds * 1000))
      const key = `agent:limit:${input.identifier}:${bucket}`
      if (!redis) return consumeMemory(key, input.limit, input.windowSeconds)

      const result = await redis.command<unknown>('EVAL', fixedWindowScript, 1, key, input.windowSeconds)
      if (!Array.isArray(result) || result.length < 2) throw new Error('Redis 限流返回格式无效')
      const count = Number(result[0])
      const ttl = Math.max(1, Number(result[1]))
      if (!Number.isFinite(count) || !Number.isFinite(ttl)) throw new Error('Redis 限流计数无效')
      return {
        allowed: count <= input.limit,
        limit: input.limit,
        remaining: Math.max(0, input.limit - count),
        resetAt: Date.now() + ttl * 1000,
        mode: 'redis'
      }
    }
  }
}
