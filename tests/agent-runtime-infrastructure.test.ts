import assert from 'node:assert/strict'
import test from 'node:test'

import { estimateRuntimeCost, getRuntimeBaselinePricing, runRuntimeBaseline } from '../lib/agent-runtime/baseline'
import type { RuntimeCheckpoint } from '../lib/agent-runtime/contracts'
import { resolveRuntimeIdentity } from '../lib/agent-runtime/identity'
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
  assert.equal(await store.save('actor-a', persisted), true)
  const restored = await store.get('actor-a', result.runId)
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
      await store.saveCheckpoint('actor-a', checkpoint)
    }
  })
  assert.ok(latest)
  const checkpoint = latest as RuntimeCheckpoint
  const restored = await store.getCheckpoint('actor-a', checkpoint.runId)
  assert.equal(restored?.version, 2)
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
  assert.deepEqual(report.releaseChecks, {
    allCasesPassed: true,
    requestIdsComplete: false,
    tokenUsageComplete: false,
    costComplete: false
  })
  assert.ok(report.samples.every((sample) => sample.checks.exactToolSequence))
})

test('baseline pricing accounts for cache reads and GPT-5.6 cache writes', () => {
  const pricing = getRuntimeBaselinePricing('gpt-5.6-luna')
  assert.ok(pricing)
  assert.equal(estimateRuntimeCost({
    inputTokens: 1_000,
    cachedInputTokens: 200,
    cacheWriteTokens: 100,
    outputTokens: 100,
    reasoningTokens: 30,
    totalTokens: 1_100
  }, pricing), 0.001445)
  assert.equal(getRuntimeBaselinePricing('unknown-model'), null)
})

test('live baseline requires complete request ids, token usage and priced cost evidence', async () => {
  const report = await runRuntimeBaseline({
    plannerFactory() {
      const fixture = createFixturePlanner()
      return {
        mode: 'openai' as const,
        model: 'gpt-5.6-luna',
        async next(context: Parameters<typeof fixture.next>[0]) {
          const turn = await fixture.next(context)
          return {
            ...turn,
            requestId: `req_${context.observations.length}`,
            usage: {
              inputTokens: 100,
              cachedInputTokens: 20,
              cacheWriteTokens: 10,
              outputTokens: 20,
              reasoningTokens: 5,
              totalTokens: 120
            }
          }
        }
      }
    }
  })

  assert.equal(report.releaseCandidate, true)
  assert.ok(report.estimatedCostUsd && report.estimatedCostUsd > 0)
  assert.deepEqual(report.evidenceCoverage, { requestIds: 1, tokenUsage: 1, cost: 1 })
  assert.ok(Object.values(report.releaseChecks).every(Boolean))
})

test('production store stays disabled without Redis credentials', async () => {
  const store = createRuntimeStore({ redis: null, allowMemory: false })
  assert.equal(store.mode, 'disabled')
  assert.equal(store.persistence, 'response-only')
  assert.equal(await store.get('actor-a', 'unknown'), null)
})

test('signed runtime identity rejects tampering and rotates to a new actor', () => {
  const env = { NODE_ENV: 'production', AGENT_SESSION_SECRET: 'a'.repeat(32) } as unknown as NodeJS.ProcessEnv
  const first = resolveRuntimeIdentity(new Request('https://example.com/api/agent/run'), {
    env,
    createId: () => '11111111-1111-4111-8111-111111111111'
  })
  assert.equal(first.configured, true)
  assert.ok(first.setCookie)
  const cookie = first.setCookie?.split(';')[0]
  const restored = resolveRuntimeIdentity(new Request('https://example.com/api/agent/run', { headers: { cookie: cookie ?? '' } }), { env })
  assert.equal(restored.actorId, first.actorId)
  assert.equal(restored.setCookie, undefined)

  const tampered = resolveRuntimeIdentity(new Request('https://example.com/api/agent/run', {
    headers: { cookie: `${cookie}broken` }
  }), {
    env,
    createId: () => '22222222-2222-4222-8222-222222222222'
  })
  assert.equal(tampered.actorId, '22222222-2222-4222-8222-222222222222')
  assert.ok(tampered.setCookie)
})

test('runtime storage isolates replay and checkpoints by signed actor scope', async () => {
  const store = createRuntimeStore({ redis: null, allowMemory: true })
  let latestCheckpoint: RuntimeCheckpoint | null = null
  const result = await runServerAgent({
    goal: '检查 task-planning-agent 项目证据',
    planner: createFixturePlanner(),
    async onCheckpoint(checkpoint) {
      latestCheckpoint = checkpoint
      await store.saveCheckpoint('actor-a', checkpoint)
    }
  })
  await store.save('actor-a', result)
  assert.equal((await store.get('actor-a', result.runId))?.run.runId, result.runId)
  assert.equal(await store.get('actor-b', result.runId), null)
  assert.ok(latestCheckpoint)
  assert.equal((await store.getCheckpoint('actor-a', result.runId))?.runId, result.runId)
  assert.equal(await store.getCheckpoint('actor-b', result.runId), null)
})

test('write tool waits for approval and an approved retry is idempotent', async () => {
  const actorId = 'actor-write'
  const store = createRuntimeStore({ redis: null, allowMemory: true })
  let waitingCheckpoint: RuntimeCheckpoint | null = null
  const waiting = await runServerAgent({
    goal: '查找 Agent 工具权限知识，并保存成学习笔记',
    planner: createFixturePlanner(),
    actorId,
    permissions: ['knowledge:read', 'projects:read', 'notes:write'],
    saveLearningNote: (note) => store.saveLearningNote(note),
    async onCheckpoint(checkpoint) {
      await store.saveCheckpoint(actorId, checkpoint)
      if (checkpoint.status === 'waiting_approval') waitingCheckpoint = checkpoint
    }
  })
  assert.equal(waiting.status, 'waiting_approval')
  assert.equal(waiting.observations.some((item) => item.name === 'save_learning_note'), false)
  assert.ok(waitingCheckpoint)

  const approved = await runServerAgent({
    goal: waiting.goal,
    planner: createFixturePlanner(),
    actorId,
    permissions: ['knowledge:read', 'projects:read', 'notes:write'],
    resumeFrom: waitingCheckpoint as unknown as RuntimeCheckpoint,
    approvalDecision: 'approve',
    saveLearningNote: (note) => store.saveLearningNote(note)
  })
  assert.equal(approved.status, 'completed')
  const saved = approved.observations.find((item) => item.name === 'save_learning_note')
  assert.equal(saved?.ok, true)
  assert.equal((saved?.output as { created: boolean }).created, true)

  const args = waiting.pendingApproval?.call.arguments as { title: string; content: string }
  const duplicate = await store.saveLearningNote({
    actorId,
    idempotencyKey: `${waiting.runId}:${waiting.pendingApproval?.call.callId}`,
    ...args
  })
  assert.equal(duplicate.created, false)
  assert.equal(duplicate.id, (saved?.output as { id: string }).id)
})

test('rejected write approval produces no write observation', async () => {
  const waiting = await runServerAgent({
    goal: '查找 Agent 工具权限知识，并保存成学习笔记',
    planner: createFixturePlanner(),
    actorId: 'actor-reject',
    permissions: ['knowledge:read', 'projects:read', 'notes:write']
  })
  const rejected = await runServerAgent({
    goal: waiting.goal,
    planner: createFixturePlanner(),
    actorId: 'actor-reject',
    permissions: ['knowledge:read', 'projects:read', 'notes:write'],
    resumeFrom: {
      version: 2,
      runId: waiting.runId,
      goal: waiting.goal,
      mode: waiting.mode,
      model: waiting.model,
      status: 'waiting_approval',
      nextTurnIndex: 1,
      maxSteps: waiting.maxSteps,
      history: [{ role: 'user', content: waiting.goal }],
      observations: waiting.observations,
      trace: waiting.trace,
      usage: waiting.usage,
      requestIds: waiting.requestIds,
      pendingApproval: waiting.pendingApproval,
      updatedAt: new Date().toISOString()
    },
    approvalDecision: 'reject'
  })
  assert.equal(rejected.status, 'rejected')
  assert.equal(rejected.observations.some((item) => item.name === 'save_learning_note'), false)
})
