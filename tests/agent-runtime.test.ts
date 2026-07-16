import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateRuntimePlanner } from '../lib/agent-runtime/evaluation'
import { createFixturePlanner } from '../lib/agent-runtime/planners'
import { runServerAgent } from '../lib/agent-runtime/runner'
import { executeRuntimeTool, runtimeToolDefinitions } from '../lib/agent-runtime/tools'

test('runtime exposes two strict read-only tool schemas', () => {
  assert.equal(runtimeToolDefinitions.length, 2)
  for (const tool of runtimeToolDefinitions) {
    assert.equal(tool.type, 'function')
    assert.equal(tool.strict, true)
    assert.equal(tool.parameters.additionalProperties, false)
    assert.deepEqual(Object.keys(tool.parameters.properties).sort(), [...tool.parameters.required].sort())
  }
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
