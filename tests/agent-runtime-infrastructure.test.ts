import assert from 'node:assert/strict'
import test from 'node:test'

import { runRuntimeBaseline } from '../lib/agent-runtime/baseline'
import type { RuntimeCheckpoint } from '../lib/agent-runtime/contracts'
import { createFixturePlanner } from '../lib/agent-runtime/planners'
import { createRuntimeRateLimiter } from '../lib/agent-runtime/rate-limit'
import { createRedisRestClient, resolveRedisRestConfig } from '../lib/agent-runtime/redis-rest'
import { runServerAgent } from '../lib/agent-runtime/runner'
import { createRuntimeStore } from '../lib/agent-runtime/storage'

test('redis config accepts Upstash and legacy Vercel KV names', () => {
  assert.deepEqual(resolveRedisRestConfig({
    UPSTASH_REDIS_REST_URL: 'https://redis.example.com/',
    UPSTASH_REDIS_REST_TOKEN: 'secret'
  } as unknown as NodeJS.ProcessEnv), { url: 'https://redis.example.com', token: 'secret' })
  assert.deepEqual(resolveRedisRestConfig({
    KV_REST_API_URL: 'https://legacy.example.com',
    KV_REST_API_TOKEN: 'legacy-secret'
  } as unknown as NodeJS.ProcessEnv), { url: 'https://legacy.example.com', token: 'legacy-secret' })
})

test('redis REST client sends commands in the official JSON-array form', async () => {
  let requestBody = ''
  const client = createRedisRestClient({ url: 'https://redis.example.com', token: 'secret' }, async (_url, init) => {
    requestBody = String(init?.body)
    return new Response(JSON.stringify({ result: 'OK' }), { status: 200 })
  })
  const result = await client.command('SET', 'agent:test', 'value', 'EX', 60)
  assert.equal(result, 'OK')
  assert.equal(requestBody, '["SET","agent:test","value","EX",60]')
})

test('memory limiter rejects requests after the fixed-window budget', async () => {
  const limiter = createRuntimeRateLimiter({ redis: null })
  const identifier = `test-${Date.now()}-${Math.random()}`
  const first = await limiter.consume({ identifier, limit: 2, windowSeconds: 60 })
  const second = await limiter.consume({ identifier, limit: 2, windowSeconds: 60 })
  const third = await limiter.consume({ identifier, limit: 2, windowSeconds: 60 })
  assert.equal(first.allowed, true)
  assert.equal(second.remaining, 0)
  assert.equal(third.allowed, false)
  assert.equal(third.mode, 'memory')
})

test('live-compatible limiter uses one atomic Redis script', async () => {
  const commands: Array<Array<string | number>> = []
  const limiter = createRuntimeRateLimiter({
    redis: {
      async command<T>(...command: Array<string | number>) {
        commands.push(command)
        return [2, 41] as T
      }
    }
  })
  const result = await limiter.consume({ identifier: 'client', limit: 4, windowSeconds: 60 })
  assert.equal(result.mode, 'redis')
  assert.equal(result.remaining, 2)
  assert.equal(commands.length, 1)
  assert.equal(commands[0]?.[0], 'EVAL')
})

test('development runtime store can replay a completed run', async () => {
  const store = createRuntimeStore({ redis: null, allowMemory: true })
  const result = await runServerAgent({ goal: '检查 task-planning-agent 项目证据', planner: createFixturePlanner() })
  const persisted = { ...result, persistence: store.persistence, replayUrl: `/api/agent/run?id=${result.runId}` }
  assert.equal(await store.save(persisted), true)
  const restored = await store.get(result.runId)
  assert.equal(store.mode, 'memory')
  assert.equal(restored?.run.runId, result.runId)
  assert.equal(restored?.run.persistence, 'ephemeral-memory')
})

test('runtime resumes from the last completed tool without duplicate execution', async () => {
  let savedCheckpoint: RuntimeCheckpoint | null = null
  const interrupted = await runServerAgent({
    goal: '先查找 Agent 工具权限知识，再检查 task-planning-agent 项目证据',
    planner: createFixturePlanner(),
    async onCheckpoint(checkpoint) {
      if (checkpoint.status === 'running' && checkpoint.observations.length === 1) {
        savedCheckpoint = checkpoint
        throw new Error('模拟函数实例中断')
      }
    }
  })
  assert.equal(interrupted.status, 'failed')
  assert.ok(savedCheckpoint)
  const checkpoint = savedCheckpoint as RuntimeCheckpoint
  assert.equal(checkpoint.nextTurnIndex, 1)
  assert.deepEqual(checkpoint.observations.map((item) => item.name), ['search_knowledge'])

  const resumed = await runServerAgent({
    goal: checkpoint.goal,
    planner: createFixturePlanner(),
    resumeFrom: checkpoint
  })
  assert.equal(resumed.status, 'completed')
  assert.equal(resumed.runId, checkpoint.runId)
  assert.deepEqual(resumed.observations.map((item) => item.name), ['search_knowledge', 'inspect_project_evidence'])
  assert.equal(resumed.trace.filter((event) => event.type === 'run_resumed').length, 1)
})

test('runtime store persists versioned checkpoints', async () => {
  const store = createRuntimeStore({ redis: null, allowMemory: true })
  let latest: RuntimeCheckpoint | null = null
  await runServerAgent({
    goal: '检查 task-planning-agent 项目证据',
    planner: createFixturePlanner(),
    async onCheckpoint(checkpoint) {
      latest = checkpoint
      await store.saveCheckpoint(checkpoint)
    }
  })
  assert.ok(latest)
  const checkpoint = latest as RuntimeCheckpoint
  const restored = await store.getCheckpoint(checkpoint.runId)
  assert.equal(restored?.version, 1)
  assert.equal(restored?.status, 'completed')
  assert.equal(restored?.nextTurnIndex, 2)
})

test('twenty-case baseline report is reproducible with fixture planners', async () => {
  const report = await runRuntimeBaseline({
    plannerFactory: createFixturePlanner,
    now: () => new Date('2026-07-16T00:00:00.000Z')
  })
  assert.equal(report.generatedAt, '2026-07-16T00:00:00.000Z')
  assert.equal(report.caseCount, 20)
  assert.equal(report.passedCount, 20)
  assert.equal(report.passRate, 1)
  assert.equal(report.allCasesPassed, true)
  assert.equal(report.releaseCandidate, false)
  assert.ok(report.samples.every((sample) => sample.checks.exactToolSequence))
})

test('production store stays disabled without Redis credentials', async () => {
  const store = createRuntimeStore({ redis: null, allowMemory: false })
  assert.equal(store.mode, 'disabled')
  assert.equal(store.persistence, 'response-only')
  assert.equal(await store.get('unknown'), null)
})
