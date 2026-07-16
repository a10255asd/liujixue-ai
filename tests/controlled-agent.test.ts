import assert from 'node:assert/strict'
import test from 'node:test'

import { agentScenarios, evaluateAgentScenarios, runAgentScenario } from '../lib/labs/controlled-agent'

test('controlled Agent covers five deterministic terminal paths', () => {
  const evaluation = evaluateAgentScenarios()
  assert.equal(agentScenarios.length, 5)
  assert.equal(evaluation.scenarioCount, 5)
  assert.equal(evaluation.statePassRate, 1)
  assert.equal(evaluation.budgetPassRate, 1)
  assert.equal(evaluation.permissionBlocks, 1)
  assert.equal(evaluation.approvalGates, 1)
})

test('retry recovery reuses one idempotency key and commits one side effect', () => {
  const run = runAgentScenario('retry-recovery')
  const incidentCalls = run.events.filter((event) => event.type === 'tool_call' && event.tool === 'fetch_incidents')

  assert.equal(run.state, 'completed')
  assert.equal(run.retries, 1)
  assert.equal(incidentCalls.length, 2)
  assert.equal(new Set(incidentCalls.map((event) => event.idempotencyKey)).size, 1)
  assert.equal(run.sideEffects, 1)
})

test('permission guard fails before any unauthorized tool call', () => {
  const run = runAgentScenario('permission-denied')

  assert.equal(run.state, 'failed')
  assert.equal(run.stepsUsed, 0)
  assert.equal(run.sideEffects, 0)
  assert.equal(run.events.some((event) => event.type === 'tool_call'), false)
  assert.equal(run.events.some((event) => event.message.includes('payroll:export')), true)
})

test('step budget terminates the loop without exceeding its limit', () => {
  const run = runAgentScenario('step-budget')

  assert.equal(run.state, 'budget_exceeded')
  assert.equal(run.stepsUsed, run.scenario.maxSteps)
  assert.equal(run.withinBudget, true)
  assert.equal(run.events.filter((event) => event.type === 'tool_call').length, run.scenario.maxSteps)
  assert.equal(run.events.at(-1)?.title, '步数预算耗尽')
})

test('high-risk action waits for approval and respects both decisions', () => {
  const pending = runAgentScenario('human-approval')
  const approved = runAgentScenario('human-approval', 'approved')
  const rejected = runAgentScenario('human-approval', 'rejected')

  assert.equal(pending.state, 'waiting_approval')
  assert.equal(pending.stepsUsed, 0)
  assert.equal(approved.state, 'completed')
  assert.equal(approved.sideEffects, 1)
  assert.equal(rejected.state, 'rejected')
  assert.equal(rejected.sideEffects, 0)
  assert.equal(rejected.events.some((event) => event.type === 'tool_call'), false)
})

test('every trace has contiguous sequence numbers and stable timestamps', () => {
  for (const scenario of agentScenarios) {
    const run = runAgentScenario(scenario.id)
    assert.deepEqual(run.events.map((event) => event.sequence), run.events.map((_, index) => index + 1))
    assert.ok(run.events.every((event) => /^T\+\d{4}ms$/.test(event.time)))
  }
})
