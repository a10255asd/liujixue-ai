import assert from 'node:assert/strict'
import test from 'node:test'

import { runRuntimeBaseline } from '../lib/agent-runtime/baseline'
import { verifyRuntimeBaselineReport } from '../lib/agent-runtime/baseline-verification'
import { createFixturePlanner } from '../lib/agent-runtime/planners'

async function createValidReport() {
  let requestSequence = 0
  return runRuntimeBaseline({
    plannerFactory() {
      const fixture = createFixturePlanner()
      return {
        mode: 'openai' as const,
        model: 'gpt-5.6-luna',
        async next(context: Parameters<typeof fixture.next>[0]) {
          const turn = await fixture.next(context)
          requestSequence += 1
          return {
            ...turn,
            requestId: `req_verification_${requestSequence}`,
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
    },
    now: () => new Date('2026-07-17T00:00:00.000Z')
  })
}

test('independent verifier accepts a complete recomputable live baseline', async () => {
  const verification = verifyRuntimeBaselineReport(await createValidReport())

  assert.equal(verification.valid, true)
  assert.equal(verification.caseCount, 20)
  assert.ok(verification.checks.every((check) => check.passed))
})

test('independent verifier rejects tampered aggregate cost', async () => {
  const report = await createValidReport()
  report.estimatedCostUsd = (report.estimatedCostUsd ?? 0) + 1
  const verification = verifyRuntimeBaselineReport(report)

  assert.equal(verification.valid, false)
  assert.equal(verification.checks.find((check) => check.id === 'cost')?.passed, false)
})

test('independent verifier rejects truncated or structurally invalid reports', async () => {
  const report = await createValidReport()
  report.samples.pop()
  assert.equal(verifyRuntimeBaselineReport(report).valid, false)
  assert.equal(verifyRuntimeBaselineReport({ schemaVersion: 1 }).valid, false)
})
