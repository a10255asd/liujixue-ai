import type { RuntimeCheckpoint, RuntimePersistence, RuntimeRunResult } from './contracts'
import { createRedisRestClient, resolveRedisRestConfig, type RedisRestClient } from './redis-rest'

export type RuntimeStorageMode = 'redis' | 'memory' | 'disabled'

type StoredRun = {
  storedAt: string
  expiresAt: string
  run: RuntimeRunResult
}

const RUN_TTL_SECONDS = 24 * 60 * 60

const globalStorage = globalThis as typeof globalThis & {
  __liujixueAgentRuns?: Map<string, StoredRun>
  __liujixueAgentCheckpoints?: Map<string, RuntimeCheckpoint>
}

const memoryRuns = globalStorage.__liujixueAgentRuns ?? new Map<string, StoredRun>()
globalStorage.__liujixueAgentRuns = memoryRuns
const memoryCheckpoints = globalStorage.__liujixueAgentCheckpoints ?? new Map<string, RuntimeCheckpoint>()
globalStorage.__liujixueAgentCheckpoints = memoryCheckpoints

function persistenceFor(mode: RuntimeStorageMode): RuntimePersistence {
  if (mode === 'redis') return 'redis-24h'
  if (mode === 'memory') return 'ephemeral-memory'
  return 'response-only'
}

export function createRuntimeStore(options: {
  redis?: RedisRestClient | null
  env?: NodeJS.ProcessEnv
  allowMemory?: boolean
} = {}) {
  const redisConfig = resolveRedisRestConfig(options.env)
  const redis = options.redis === undefined
    ? (redisConfig ? createRedisRestClient(redisConfig) : null)
    : options.redis
  const mode: RuntimeStorageMode = redis ? 'redis' : options.allowMemory ? 'memory' : 'disabled'

  return {
    mode,
    persistence: persistenceFor(mode),
    async save(run: RuntimeRunResult) {
      if (mode === 'disabled') return false
      const storedAt = new Date()
      const record: StoredRun = {
        storedAt: storedAt.toISOString(),
        expiresAt: new Date(storedAt.getTime() + RUN_TTL_SECONDS * 1000).toISOString(),
        run
      }
      if (redis) {
        await redis.command('SET', `agent:run:${run.runId}`, JSON.stringify(record), 'EX', RUN_TTL_SECONDS)
      } else {
        memoryRuns.set(run.runId, record)
      }
      return true
    },
    async get(runId: string): Promise<StoredRun | null> {
      if (mode === 'disabled') return null
      if (redis) {
        const value = await redis.command<string | null>('GET', `agent:run:${runId}`)
        if (!value) return null
        try {
          return JSON.parse(value) as StoredRun
        } catch {
          throw new Error('已保存运行记录无法解析')
        }
      }
      const record = memoryRuns.get(runId)
      if (!record) return null
      if (new Date(record.expiresAt).getTime() <= Date.now()) {
        memoryRuns.delete(runId)
        return null
      }
      return record
    },
    async saveCheckpoint(checkpoint: RuntimeCheckpoint) {
      if (mode === 'disabled') return false
      if (redis) {
        await redis.command('SET', `agent:checkpoint:${checkpoint.runId}`, JSON.stringify(checkpoint), 'EX', RUN_TTL_SECONDS)
      } else {
        memoryCheckpoints.set(checkpoint.runId, checkpoint)
      }
      return true
    },
    async getCheckpoint(runId: string): Promise<RuntimeCheckpoint | null> {
      if (mode === 'disabled') return null
      if (redis) {
        const value = await redis.command<string | null>('GET', `agent:checkpoint:${runId}`)
        if (!value) return null
        try {
          return JSON.parse(value) as RuntimeCheckpoint
        } catch {
          throw new Error('运行检查点无法解析')
        }
      }
      return memoryCheckpoints.get(runId) ?? null
    }
  }
}
