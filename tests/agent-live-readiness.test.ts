import assert from 'node:assert/strict'
import test from 'node:test'

import { inspectAgentLiveReadiness } from '../lib/agent-runtime/live-readiness'

test('live readiness reports every missing prerequisite without exposing secret values', () => {
  const report = inspectAgentLiveReadiness({})

  assert.equal(report.baselineReady, false)
  assert.equal(report.productionReady, false)
  assert.equal(report.checks.length, 6)
  assert.ok(report.nextActions.includes('缺少 OPENAI_API_KEY'))
  assert.doesNotMatch(JSON.stringify(report), /Bearer|sk-/)
})

test('baseline and production readiness require priced model plus production infrastructure', () => {
  const baselineOnly = inspectAgentLiveReadiness({
    OPENAI_API_KEY: 'secret-model-key',
    OPENAI_AGENT_MODEL: 'gpt-5.6-luna'
  })
  assert.equal(baselineOnly.baselineReady, true)
  assert.equal(baselineOnly.productionReady, false)

  const ready = inspectAgentLiveReadiness({
    OPENAI_API_KEY: 'secret-model-key',
    OPENAI_AGENT_MODEL: 'gpt-5.6-luna',
    AGENT_RUNTIME_MODE: 'openai',
    UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'redis-secret',
    AGENT_SESSION_SECRET: 'a'.repeat(32)
  })
  assert.equal(ready.baselineReady, true)
  assert.equal(ready.productionReady, true)
  assert.deepEqual(ready.nextActions, [])
})

test('unknown model fails the cost evidence gate', () => {
  const report = inspectAgentLiveReadiness({
    OPENAI_API_KEY: 'secret-model-key',
    OPENAI_AGENT_MODEL: 'unpriced-model'
  })

  assert.equal(report.baselineReady, false)
  assert.equal(report.checks.find((check) => check.id === 'pricing')?.passed, false)
})
