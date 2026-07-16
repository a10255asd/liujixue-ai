import type { RuntimePlanner, RuntimeToolName, RuntimeUsage } from './contracts'
import { getRuntimeEvaluationCases } from './evaluation'
import { runServerAgent } from './runner'

export type RuntimeBaselineSample = {
  id: string
  goal: string
  expectedTools: RuntimeToolName[]
  actualTools: RuntimeToolName[]
  status: string
  passed: boolean
  checks: {
    completed: boolean
    exactToolSequence: boolean
    allToolsSucceeded: boolean
    hasSummary: boolean
  }
  latencyMs: number
  usage: RuntimeUsage
  requestIds: string[]
  failureReason?: string
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1)] ?? 0
}

export async function runRuntimeBaseline(options: {
  plannerFactory: () => RuntimePlanner
  now?: () => Date
}) {
  const cases = getRuntimeEvaluationCases()
  const samples: RuntimeBaselineSample[] = []

  for (const evaluationCase of cases) {
    const startedAt = Date.now()
    try {
      const run = await runServerAgent({ goal: evaluationCase.goal, planner: options.plannerFactory() })
      const actualTools = run.observations.map((item) => item.name)
      const checks = {
        completed: run.status === 'completed',
        exactToolSequence: JSON.stringify(actualTools) === JSON.stringify(evaluationCase.expectedTools),
        allToolsSucceeded: run.observations.every((item) => item.ok),
        hasSummary: run.summary.trim().length >= 8
      }
      samples.push({
        id: evaluationCase.id,
        goal: evaluationCase.goal,
        expectedTools: evaluationCase.expectedTools,
        actualTools,
        status: run.status,
        passed: Object.values(checks).every(Boolean),
        checks,
        latencyMs: Date.now() - startedAt,
        usage: run.usage,
        requestIds: run.requestIds
      })
    } catch (error) {
      samples.push({
        id: evaluationCase.id,
        goal: evaluationCase.goal,
        expectedTools: evaluationCase.expectedTools,
        actualTools: [],
        status: 'runner_error',
        passed: false,
        checks: { completed: false, exactToolSequence: false, allToolsSucceeded: false, hasSummary: false },
        latencyMs: Date.now() - startedAt,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        requestIds: [],
        failureReason: error instanceof Error ? error.message : '未知运行错误'
      })
    }
  }

  const planner = options.plannerFactory()
  const totalUsage = samples.reduce<RuntimeUsage>((total, sample) => ({
    inputTokens: total.inputTokens + sample.usage.inputTokens,
    outputTokens: total.outputTokens + sample.usage.outputTokens,
    totalTokens: total.totalTokens + sample.usage.totalTokens
  }), { inputTokens: 0, outputTokens: 0, totalTokens: 0 })
  const passedCount = samples.filter((sample) => sample.passed).length
  const latencies = samples.map((sample) => sample.latencyMs)

  return {
    schemaVersion: 1,
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    mode: planner.mode,
    model: planner.model,
    caseCount: samples.length,
    passedCount,
    passRate: passedCount / samples.length,
    allCasesPassed: passedCount === samples.length,
    releaseCandidate: planner.mode === 'openai' && passedCount === samples.length,
    latency: {
      averageMs: Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length),
      p95Ms: percentile(latencies, 0.95)
    },
    usage: totalUsage,
    requestIds: [...new Set(samples.flatMap((sample) => sample.requestIds))],
    samples
  }
}
