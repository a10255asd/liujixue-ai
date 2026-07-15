import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateRegressionVersion, getPromptRegressionReports, regressionVersions } from '../lib/labs/prompt-regression'

test('prompt regression reports expose deterministic quality latency and cost metrics', () => {
  const reports = getPromptRegressionReports()
  assert.equal(reports.length, 2)
  assert.equal(reports[0].samples.length, 4)
  assert.equal(reports[0].schemaPassRate, 75)
  assert.equal(reports[0].businessPassRate, 25)
  assert.equal(reports[1].schemaPassRate, 100)
  assert.equal(reports[1].businessPassRate, 100)
  assert.ok(reports.every((report) => report.p95LatencyMs > 0 && report.averageCost > 0))
})

test('prompt regression identifies malformed output and business mismatches separately', () => {
  const report = evaluateRegressionVersion(regressionVersions[0])
  const malformed = report.samples.find((sample) => sample.id === 'suspicious-login')
  const mismatch = report.samples.find((sample) => sample.id === 'refund-delay')

  assert.equal(malformed?.schemaPass, false)
  assert.ok(malformed?.issues.some((issue) => issue.includes('priority')))
  assert.equal(mismatch?.schemaPass, true)
  assert.equal(mismatch?.businessPass, false)
  assert.deepEqual(mismatch?.issues, ['优先级应为 high'])
})
