import assert from 'node:assert/strict'
import test from 'node:test'

import { GET } from '../app/api/agent/notes/route'
import { resolveRuntimeIdentity } from '../lib/agent-runtime/identity'
import { createRuntimeStore } from '../lib/agent-runtime/storage'

const ENV_KEYS = [
  'NODE_ENV',
  'AGENT_SESSION_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN'
]

function withEnv<T>(overrides: Record<string, string | undefined>, run: () => Promise<T> | T) {
  const saved = new Map(ENV_KEYS.map((key) => [key, process.env[key]]))
  for (const key of ENV_KEYS) delete process.env[key]
  Object.assign(process.env, Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined)))
  const restore = () => {
    for (const key of ENV_KEYS) {
      const value = saved.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
  try {
    const result = run()
    if (result instanceof Promise) return result.finally(restore)
    restore()
    return result
  } catch (error) {
    restore()
    throw error
  }
}

function mintSessionCookie(actorId: string) {
  const identity = resolveRuntimeIdentity(new Request('https://ai.liujixue.cn/api/agent/notes'), {
    createId: () => actorId
  })
  assert.ok(identity.setCookie)
  return identity.setCookie.split(';')[0]
}

test('note listing is isolated by actor scope in the memory store', async () => {
  const store = createRuntimeStore({ redis: null, allowMemory: true })
  await store.saveLearningNote({ actorId: 'actor-notes-a', idempotencyKey: 'run-a:call-1', title: '第一条笔记', content: 'actor A 的笔记正文内容' })
  await store.saveLearningNote({ actorId: 'actor-notes-a', idempotencyKey: 'run-a:call-2', title: '第二条笔记', content: 'actor A 的另一条笔记' })
  await store.saveLearningNote({ actorId: 'actor-notes-b', idempotencyKey: 'run-b:call-1', title: '他人笔记', content: 'actor B 的笔记正文内容' })

  const aNotes = await store.listLearningNotes('actor-notes-a')
  assert.deepEqual(aNotes.map((note) => note.title).sort(), ['第一条笔记', '第二条笔记'])
  const bNotes = await store.listLearningNotes('actor-notes-b')
  assert.deepEqual(bNotes.map((note) => note.title), ['他人笔记'])
  assert.deepEqual(await store.listLearningNotes('actor-notes-unknown'), [])
})

test('note listing sorts by createdAt descending', async () => {
  const store = createRuntimeStore({ redis: null, allowMemory: true })
  await store.saveLearningNote({ actorId: 'actor-notes-sort', idempotencyKey: 'run-s:call-1', title: '较早笔记', content: '较早保存的笔记正文' })
  await new Promise((resolve) => setTimeout(resolve, 5))
  await store.saveLearningNote({ actorId: 'actor-notes-sort', idempotencyKey: 'run-s:call-2', title: '较晚笔记', content: '较晚保存的笔记正文' })
  const notes = await store.listLearningNotes('actor-notes-sort')
  assert.deepEqual(notes.map((note) => note.title), ['较晚笔记', '较早笔记'])
})

test('redis-backed listing scans only the caller actor scope', async () => {
  const data = new Map<string, string>()
  const scanPatterns: string[] = []
  const redis = {
    async command<T>(...command: Array<string | number>): Promise<T> {
      const [cmd, ...args] = command.map(String)
      if (cmd === 'SCAN') {
        scanPatterns.push(args[2])
        const prefix = args[2].replace(/\*$/, '')
        return ['0', [...data.keys()].filter((key) => key.startsWith(prefix))] as T
      }
      if (cmd === 'GET') return (data.get(args[0]) ?? null) as T
      if (cmd === 'SET') {
        data.set(args[0], args[1])
        return 'OK' as T
      }
      throw new Error(`unexpected command ${cmd}`)
    }
  }
  const store = createRuntimeStore({ redis, allowMemory: false })
  await store.saveLearningNote({ actorId: 'actor-redis-a', idempotencyKey: 'run-ra:call-1', title: 'Redis 笔记', content: 'Redis 中的笔记正文' })
  await store.saveLearningNote({ actorId: 'actor-redis-b', idempotencyKey: 'run-rb:call-1', title: 'Redis 他人笔记', content: 'Redis 中他人笔记正文' })

  const notes = await store.listLearningNotes('actor-redis-a')
  assert.deepEqual(notes.map((note) => note.title), ['Redis 笔记'])
  assert.ok(scanPatterns.length >= 1)
  assert.ok(scanPatterns.every((pattern) => pattern.endsWith(':note:*')))
  assert.ok(!data.keys().next().done)
})

test('disabled store returns an empty note list', async () => {
  const store = createRuntimeStore({ redis: null, allowMemory: false })
  assert.equal(store.mode, 'disabled')
  assert.deepEqual(await store.listLearningNotes('actor-any'), [])
})

test('notes API degrades with machine-readable reason when identity is disabled', async () => {
  await withEnv({ NODE_ENV: 'production' }, async () => {
    const response = await GET(new Request('https://ai.liujixue.cn/api/agent/notes'))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.deepEqual(body.notes, [])
    assert.equal(body.identityMode, 'disabled')
    assert.equal(body.storageMode, 'response-only')
    assert.equal(body.reason, 'identity-disabled')
  })
})

test('notes API returns empty list with no-session reason for a fresh visitor', async () => {
  await withEnv({ NODE_ENV: 'development' }, async () => {
    const response = await GET(new Request('http://localhost:3000/api/agent/notes'))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.deepEqual(body.notes, [])
    assert.equal(body.identityMode, 'signed-session')
    assert.equal(body.storageMode, 'ephemeral-memory')
    assert.equal(body.reason, 'no-session')
    assert.ok(response.headers.get('set-cookie')?.includes('liujixue_agent_session='))
  })
})

test('notes API returns only the signed actor notes with runId', async () => {
  await withEnv({ NODE_ENV: 'development' }, async () => {
    const actorId = '11111111-1111-4111-8111-111111111111'
    const cookie = mintSessionCookie(actorId)
    const store = createRuntimeStore({ redis: null, allowMemory: true })
    await store.saveLearningNote({ actorId, idempotencyKey: 'run-api-1:call-1', title: '会话笔记', content: '属于当前签名会话的笔记' })
    await store.saveLearningNote({ actorId: '22222222-2222-4222-8222-222222222222', idempotencyKey: 'run-api-2:call-1', title: '他人笔记', content: '不应出现在响应里' })

    const response = await GET(new Request('http://localhost:3000/api/agent/notes', { headers: { cookie } }))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.reason, null)
    assert.equal(body.notes.length, 1)
    assert.equal(body.notes[0].title, '会话笔记')
    assert.equal(body.notes[0].runId, 'run-api-1')
    assert.ok(body.notes[0].createdAt)
    assert.ok(response.headers.get('x-ratelimit-limit'))
  })
})
