import { createHash, randomUUID } from 'node:crypto'

import type { RuntimeCheckpoint, RuntimePersistence, RuntimeRunResult } from './contracts'
import type { SavedLearningNote } from './tools'
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
  __liujixueAgentNotes?: Map<string, SavedLearningNote>
}

const memoryRuns = globalStorage.__liujixueAgentRuns ?? new Map<string, StoredRun>()
globalStorage.__liujixueAgentRuns = memoryRuns
const memoryCheckpoints = globalStorage.__liujixueAgentCheckpoints ?? new Map<string, RuntimeCheckpoint>()
globalStorage.__liujixueAgentCheckpoints = memoryCheckpoints
const memoryNotes = globalStorage.__liujixueAgentNotes ?? new Map<string, SavedLearningNote>()
globalStorage.__liujixueAgentNotes = memoryNotes

function actorScope(actorId: string) {
  return createHash('sha256').update(actorId).digest('hex').slice(0, 24)
}

function scopedKey(actorId: string, kind: 'run' | 'checkpoint' | 'note', id: string) {
  return `agent:${actorScope(actorId)}:${kind}:${id}`
}

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
    async save(actorId: string, run: RuntimeRunResult) {
      if (mode === 'disabled') return false
      const storedAt = new Date()
      const record: StoredRun = {
        storedAt: storedAt.toISOString(),
        expiresAt: new Date(storedAt.getTime() + RUN_TTL_SECONDS * 1000).toISOString(),
        run
      }
      if (redis) {
        await redis.command('SET', scopedKey(actorId, 'run', run.runId), JSON.stringify(record), 'EX', RUN_TTL_SECONDS)
      } else {
        memoryRuns.set(scopedKey(actorId, 'run', run.runId), record)
      }
      return true
    },
    async get(actorId: string, runId: string): Promise<StoredRun | null> {
      if (mode === 'disabled') return null
      if (redis) {
        const value = await redis.command<string | null>('GET', scopedKey(actorId, 'run', runId))
        if (!value) return null
        try {
          return JSON.parse(value) as StoredRun
        } catch {
          throw new Error('已保存运行记录无法解析')
        }
      }
      const key = scopedKey(actorId, 'run', runId)
      const record = memoryRuns.get(key)
      if (!record) return null
      if (new Date(record.expiresAt).getTime() <= Date.now()) {
        memoryRuns.delete(key)
        return null
      }
      return record
    },
    async saveCheckpoint(actorId: string, checkpoint: RuntimeCheckpoint) {
      if (mode === 'disabled') return false
      if (redis) {
        await redis.command('SET', scopedKey(actorId, 'checkpoint', checkpoint.runId), JSON.stringify(checkpoint), 'EX', RUN_TTL_SECONDS)
      } else {
        memoryCheckpoints.set(scopedKey(actorId, 'checkpoint', checkpoint.runId), checkpoint)
      }
      return true
    },
    async getCheckpoint(actorId: string, runId: string): Promise<RuntimeCheckpoint | null> {
      if (mode === 'disabled') return null
      if (redis) {
        const value = await redis.command<string | null>('GET', scopedKey(actorId, 'checkpoint', runId))
        if (!value) return null
        try {
          return JSON.parse(value) as RuntimeCheckpoint
        } catch {
          throw new Error('运行检查点无法解析')
        }
      }
      return memoryCheckpoints.get(scopedKey(actorId, 'checkpoint', runId)) ?? null
    },
    async saveLearningNote(input: { actorId: string; idempotencyKey: string; title: string; content: string }): Promise<SavedLearningNote> {
      if (mode === 'disabled') throw new Error('学习笔记写入仓储尚未配置')
      const key = scopedKey(input.actorId, 'note', input.idempotencyKey)
      if (redis) {
        const existing = await redis.command<string | null>('GET', key)
        if (existing) return { ...(JSON.parse(existing) as SavedLearningNote), created: false }
      } else {
        const existing = memoryNotes.get(key)
        if (existing) return { ...existing, created: false }
      }

      const note: SavedLearningNote = {
        id: randomUUID(),
        title: input.title,
        content: input.content,
        createdAt: new Date().toISOString(),
        idempotencyKey: input.idempotencyKey,
        created: true
      }
      if (redis) {
        const result = await redis.command<string | null>('SET', key, JSON.stringify(note), 'NX', 'EX', RUN_TTL_SECONDS)
        if (result !== 'OK') {
          const winner = await redis.command<string | null>('GET', key)
          if (!winner) throw new Error('学习笔记幂等写入失败')
          return { ...(JSON.parse(winner) as SavedLearningNote), created: false }
        }
      } else {
        memoryNotes.set(key, note)
      }
      return note
    },
    async listLearningNotes(actorId: string): Promise<SavedLearningNote[]> {
      if (mode === 'disabled') return []
      const prefix = scopedKey(actorId, 'note', '')
      const byCreatedDesc = (a: SavedLearningNote, b: SavedLearningNote) => b.createdAt.localeCompare(a.createdAt)
      if (!redis) {
        return [...memoryNotes.entries()]
          .filter(([key]) => key.startsWith(prefix))
          .map(([, note]) => note)
          .sort(byCreatedDesc)
      }

      const keys: string[] = []
      let cursor = '0'
      do {
        const page = await redis.command<unknown>('SCAN', cursor, 'MATCH', `${prefix}*`, 'COUNT', 100)
        if (!Array.isArray(page) || page.length < 2 || !Array.isArray(page[1])) throw new Error('Redis 笔记扫描返回格式无效')
        cursor = String(page[0])
        keys.push(...page[1].map(String))
      } while (cursor !== '0')

      const notes: SavedLearningNote[] = []
      for (const key of keys) {
        const value = await redis.command<string | null>('GET', key)
        if (!value) continue
        try {
          notes.push(JSON.parse(value) as SavedLearningNote)
        } catch {
          throw new Error('已保存学习笔记无法解析')
        }
      }
      return notes.sort(byCreatedDesc)
    }
  }
}
