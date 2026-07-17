import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateRuntimePlanner } from '../lib/agent-runtime/evaluation'
import { createFixturePlanner, createOpenAiPlanner } from '../lib/agent-runtime/planners'
import { runServerAgent } from '../lib/agent-runtime/runner'
import { executeRuntimeTool, getRuntimeToolContracts, runtimeToolDefinitions } from '../lib/agent-runtime/tools'

test('runtime exposes three strict tool schemas with one approval-gated write', () => {
  assert.equal(runtimeToolDefinitions.length, 3)
  for (const tool of runtimeToolDefinitions) {
    assert.equal(tool.type, 'function')
    assert.equal(tool.strict, true)
    assert.equal(tool.parameters.additionalProperties, false)
    assert.deepEqual(Object.keys(tool.parameters.properties).sort(), [...tool.parameters.required].sort())
  }
  const contracts = getRuntimeToolContracts()
  assert.equal(contracts.filter((tool) => tool.risk === 'read').length, 2)
  assert.deepEqual(contracts.find((tool) => tool.risk === 'write'), {
    name: 'save_learning_note',
    label: '保存学习笔记',
    permission: 'notes:write',
    risk: 'write'
  })
})

test('knowledge tool reads published content and enforces permissions', async () => {
  const allowed = await executeRuntimeTool({
    callId: 'allowed', name: 'search_knowledge', arguments: { query: 'Agent 停止条件', limit: 3 }, permissions: ['knowledge:read']
  })
  const denied = await executeRuntimeTool({
    callId: 'denied', name: 'search_knowledge', arguments: { query: 'Agent 停止条件', limit: 3 }, permissions: []
  })

  assert.equal(allowed.ok, true)
  assert.ok((allowed.output as { count: number }).count > 0)
  assert.equal(denied.ok, false)
  assert.match(denied.error ?? '', /knowledge:read/)
})

test('project evidence tool returns the honest prototype boundary', async () => {
  const result = await executeRuntimeTool({
    callId: 'project', name: 'inspect_project_evidence', arguments: { slug: 'task-planning-agent' }, permissions: ['projects:read']
  })
  const output = result.output as { deliveryStatus: string; artifacts: string[] }

  assert.equal(result.ok, true)
  assert.equal(output.deliveryStatus, 'prototype')
  assert.ok(output.artifacts.length >= 2)
})

test('server fixture runner executes real tools with a bounded trace', async () => {
  const result = await runServerAgent({
    goal: '先查找 Agent 工具权限知识，再检查 task-planning-agent 项目证据',
    planner: createFixturePlanner()
  })

  assert.equal(result.status, 'completed')
  assert.equal(result.mode, 'fixture')
  assert.equal(result.stepsUsed, 2)
  assert.deepEqual(result.observations.map((item) => item.name), ['search_knowledge', 'inspect_project_evidence'])
  assert.ok(result.observations.every((item) => item.ok))
  assert.deepEqual(result.trace.map((event) => event.sequence), result.trace.map((_, index) => index + 1))
  assert.equal(result.persistence, 'response-only')
})

test('twenty runtime contract cases are deterministic and passing', () => {
  const evaluation = evaluateRuntimePlanner()
  assert.equal(evaluation.caseCount, 20)
  assert.equal(evaluation.passedCount, 20)
  assert.equal(evaluation.passRate, 1)
})

test('OpenAI planner captures usage and request ids for production evidence', async () => {
  let requestBody: Record<string, unknown> = {}
  const planner = createOpenAiPlanner({
    apiKey: 'test-key',
    model: 'test-model',
    safetyIdentifier: 'actor-hash-test',
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({
        output: [{ type: 'message', content: [{ type: 'output_text', text: '已完成证据总结。' }] }],
        output_text: '已完成证据总结。',
        usage: {
          input_tokens: 12,
          input_tokens_details: { cached_tokens: 4, cache_write_tokens: 2 },
          output_tokens: 8,
          output_tokens_details: { reasoning_tokens: 3 },
          total_tokens: 20
        }
      }), { status: 200, headers: { 'x-request-id': 'req_test_123' } })
    }
  })
  const turn = await planner.next({ goal: '检查 Agent 证据', history: [], observations: [] })
  assert.equal(turn.requestId, 'req_test_123')
  assert.equal(turn.usage.totalTokens, 20)
  assert.equal(turn.usage.cachedInputTokens, 4)
  assert.equal(turn.usage.cacheWriteTokens, 2)
  assert.equal(turn.usage.reasoningTokens, 3)
  assert.equal(turn.finalText, '已完成证据总结。')
  assert.equal(requestBody.service_tier, 'default')
  assert.equal(requestBody.safety_identifier, 'actor-hash-test')
})
