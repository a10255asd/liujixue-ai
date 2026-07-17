import assert from 'node:assert/strict'
import test from 'node:test'

import { runAgentProductionSmoke } from '../lib/agent-runtime/production-smoke'

const ids = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
]

function idFactory() {
  let index = 0
  return () => ids[index++] ?? '33333333-3333-4333-8333-333333333333'
}

function response(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers }
  })
}

function readRun(runId: string, persistence: 'response-only' | 'redis-24h') {
  return {
    runId,
    status: 'completed',
    persistence,
    observations: [{ name: 'inspect_project_evidence', ok: true }]
  }
}

test('production smoke accepts the honest read-only fixture baseline', async () => {
  const fetchImpl: typeof fetch = async (_url, init) => {
    if (!init?.method) {
      return response({
        plannerMode: 'fixture',
        openAiConfigured: false,
        rateLimitMode: 'memory',
        storageMode: 'disabled',
        identityMode: 'disabled',
        writeToolsEnabled: false
      })
    }
    const body = JSON.parse(String(init.body)) as { runId: string }
    return response(readRun(body.runId, 'response-only'))
  }

  const report = await runAgentProductionSmoke({
    baseUrl: 'https://ai.example.com/',
    fetchImpl,
    createId: idFactory(),
    now: () => new Date('2026-07-17T00:00:00.000Z')
  })

  assert.equal(report.generatedAt, '2026-07-17T00:00:00.000Z')
  assert.equal(report.safeToServe, true)
  assert.equal(report.releaseReady, false)
  assert.equal(report.liveModelReady, false)
  assert.equal(report.expectationPassed, true)
  assert.equal(report.checks.find((check) => check.id === 'redis-storage')?.passed, false)
})

test('release smoke requires Redis, signed isolation and one approved write', async () => {
  const actorA = 'liujixue_agent_session=actor-a'
  const actorB = 'liujixue_agent_session=actor-b'
  let capabilityCount = 0
  let approvalCount = 0
  let readRunId = ''
  let writeRunId = ''
  let livePlanner = false

  const fetchImpl: typeof fetch = async (urlInput, init) => {
    const url = String(urlInput)
    const method = init?.method ?? 'GET'
    const cookie = new Headers(init?.headers).get('cookie')
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, string> : {}

    if (method === 'GET' && !url.includes('?id=')) {
      capabilityCount += 1
      return response({
        plannerMode: livePlanner ? 'openai' : 'fixture',
        openAiConfigured: livePlanner,
        rateLimitMode: 'redis',
        storageMode: 'redis',
        identityMode: 'signed-session',
        writeToolsEnabled: true
      }, { headers: { 'set-cookie': `${capabilityCount === 1 ? actorA : actorB}; Path=/; HttpOnly` } })
    }

    if (method === 'GET' && url.includes(`?id=${readRunId}`)) {
      if (cookie === actorA) return response({ run: readRun(readRunId, 'redis-24h') })
      return response({ error: 'not found' }, { status: 404 })
    }

    if (body.goal === '检查 task-planning-agent 项目证据') {
      readRunId = body.runId
      return response(readRun(readRunId, 'redis-24h'))
    }

    if (body.goal === '查找 Agent 工具权限知识，并保存成学习笔记') {
      writeRunId = body.runId
      return response({
        runId: writeRunId,
        status: 'waiting_approval',
        observations: [{ name: 'search_knowledge', ok: true }]
      }, { status: 202 })
    }

    if (body.approvalRunId === writeRunId) {
      approvalCount += 1
      if (approvalCount > 1) return response({ error: 'completed' }, { status: 409 })
      return response({
        runId: writeRunId,
        status: 'completed',
        observations: [
          { name: 'search_knowledge', ok: true },
          { name: 'save_learning_note', ok: true, output: { created: true } }
        ]
      })
    }

    return response({ error: 'unexpected request' }, { status: 500 })
  }

  const report = await runAgentProductionSmoke({
    baseUrl: 'https://ai.example.com',
    expectation: 'runtime-ready',
    fetchImpl,
    createId: idFactory()
  })

  assert.equal(report.safeToServe, true)
  assert.equal(report.releaseReady, true)
  assert.equal(report.liveModelReady, false)
  assert.equal(report.expectationPassed, true)
  assert.ok(report.checks.filter((check) => check.gate !== 'live').every((check) => check.passed))

  livePlanner = true
  capabilityCount = 0
  approvalCount = 0
  readRunId = ''
  writeRunId = ''
  const liveReport = await runAgentProductionSmoke({
    baseUrl: 'https://ai.example.com',
    expectation: 'live-model-ready',
    fetchImpl,
    createId: idFactory()
  })
  assert.equal(liveReport.releaseReady, true)
  assert.equal(liveReport.liveModelReady, true)
  assert.equal(liveReport.expectationPassed, true)
  assert.ok(liveReport.checks.every((check) => check.passed))
})

test('release expectation fails closed on the read-only fixture baseline', async () => {
  const fetchImpl: typeof fetch = async (_url, init) => {
    if (!init?.method) {
      return response({
        plannerMode: 'fixture',
        rateLimitMode: 'memory',
        storageMode: 'disabled',
        identityMode: 'disabled',
        writeToolsEnabled: false
      })
    }
    const body = JSON.parse(String(init.body)) as { runId: string }
    return response(readRun(body.runId, 'response-only'))
  }

  const report = await runAgentProductionSmoke({
    baseUrl: 'https://ai.example.com',
    expectation: 'runtime-ready',
    fetchImpl,
    createId: idFactory()
  })

  assert.equal(report.safeToServe, true)
  assert.equal(report.releaseReady, false)
  assert.equal(report.expectationPassed, false)
})
