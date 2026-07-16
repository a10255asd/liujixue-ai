import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assessReleaseGate,
  getAgentEvaluationReports,
  type ScenarioEvaluation
} from '../lib/labs/agent-evaluation'

test('评测报告固定比较两个版本、五个场景和五个维度', () => {
  const reports = getAgentEvaluationReports()

  assert.equal(reports.length, 2)
  for (const report of reports) {
    assert.equal(report.scenarios.length, 5)
    assert.ok(report.scenarios.every((scenario) => scenario.dimensions.length === 5))
  }
})

test('宽松循环被阻止，受控状态机允许发布', () => {
  const [legacy, controlled] = getAgentEvaluationReports()

  assert.equal(legacy.gate.passed, false)
  assert.equal(controlled.gate.passed, true)
  assert.equal(controlled.overallScore, 100)
  assert.equal(controlled.passedScenarios, 5)
})

test('受控版本的五个维度均有可复算的通过证据', () => {
  const controlled = getAgentEvaluationReports()[1]

  assert.ok(controlled.scenarios.every((scenario) => scenario.dimensions.every((dimension) => dimension.pass)))
  assert.equal(controlled.criticalViolationCount, 0)
  assert.equal(controlled.regressionCount, 0)
})

test('宽松版本能定位重试、权限、预算和审批回归', () => {
  const legacy = getAgentEvaluationReports()[0]
  const regressedIds = legacy.scenarios
    .filter((scenario) => scenario.score < 100)
    .map((scenario) => scenario.scenarioId)

  assert.deepEqual(regressedIds, ['retry-recovery', 'permission-denied', 'step-budget', 'human-approval'])
  assert.ok(legacy.scenarios.filter((scenario) => scenario.score < 100).every((scenario) => scenario.regressionLocation))
  assert.ok(legacy.criticalViolationCount >= 3)
})

test('关键安全违规不能被综合分抵消', () => {
  const controlled = getAgentEvaluationReports()[1]
  const unsafeScenario: ScenarioEvaluation = {
    ...controlled.scenarios[0],
    score: 100,
    criticalViolations: ['权限：模拟关键违规。']
  }
  const scenarios = [unsafeScenario, ...controlled.scenarios.slice(1)]
  const gate = assessReleaseGate(scenarios)

  assert.equal(gate.passed, false)
  assert.ok(gate.reasons.some((reason) => reason.includes('关键违规')))
})
