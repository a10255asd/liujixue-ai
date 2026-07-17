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
  estimatedCostUsd: number | null
  requestIds: string[]
  failureReason?: string
}

export type RuntimeBaselinePricing = {
  currency: 'USD'
  inputPerMillion: number
  cachedInputPerMillion: number
  cacheWriteMultiplier: number
  outputPerMillion: number
  scope: string
  capturedAt: string
  source: string
}

const gpt56Pricing: Record<string, RuntimeBaselinePricing> = {
  'gpt-5.6-sol': {
    currency: 'USD', inputPerMillion: 5, cachedInputPerMillion: 0.5, cacheWriteMultiplier: 1.25, outputPerMillion: 30,
    scope: 'standard processing, context at or below 272K tokens', capturedAt: '2026-07-17',
    source: 'https://developers.openai.com/api/docs/models/gpt-5.6-sol'
  },
  'gpt-5.6-terra': {
    currency: 'USD', inputPerMillion: 2.5, cachedInputPerMillion: 0.25, cacheWriteMultiplier: 1.25, outputPerMillion: 15,
    scope: 'standard processing, context at or below 272K tokens', capturedAt: '2026-07-17',
    source: 'https://developers.openai.com/api/docs/models/gpt-5.6-terra'
  },
  'gpt-5.6-luna': {
    currency: 'USD', inputPerMillion: 1, cachedInputPerMillion: 0.1, cacheWriteMultiplier: 1.25, outputPerMillion: 6,
    scope: 'standard processing, context at or below 272K tokens', capturedAt: '2026-07-17',
    source: 'https://developers.openai.com/api/docs/models/gpt-5.6-luna'
  }
}

function round(value: number, digits = 8) {
  return Number(value.toFixed(digits))
}

export function getRuntimeBaselinePricing(model: string) {
  return gpt56Pricing[model] ?? null
}

export function estimateRuntimeCost(usage: RuntimeUsage, pricing: RuntimeBaselinePricing | null) {
  if (!pricing) return null
  const cachedInputTokens = Math.min(usage.inputTokens, usage.cachedInputTokens)
  const cacheWriteTokens = Math.min(usage.inputTokens - cachedInputTokens, usage.cacheWriteTokens)
  const uncachedInputTokens = Math.max(0, usage.inputTokens - cachedInputTokens - cacheWriteTokens)
  return round(
    (uncachedInputTokens / 1_000_000) * pricing.inputPerMillion +
    (cachedInputTokens / 1_000_000) * pricing.cachedInputPerMillion +
    (cacheWriteTokens / 1_000_000) * pricing.inputPerMillion * pricing.cacheWriteMultiplier +
    (usage.outputTokens / 1_000_000) * pricing.outputPerMillion
  )
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1)] ?? 0
}

export async function runRuntimeBaseline(options: {
  plannerFactory: () => RuntimePlanner
  pricing?: RuntimeBaselinePricing | null
  now?: () => Date
}) {
  const cases = getRuntimeEvaluationCases()
  const samples: RuntimeBaselineSample[] = []
  const referencePlanner = options.plannerFactory()
  const pricing = options.pricing === undefined ? getRuntimeBaselinePricing(referencePlanner.model) : options.pricing

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
        estimatedCostUsd: estimateRuntimeCost(run.usage, pricing),
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
        usage: { inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0 },
        estimatedCostUsd: pricing ? 0 : null,
        requestIds: [],
        failureReason: error instanceof Error ? error.message : '未知运行错误'
      })
    }
  }

  const totalUsage = samples.reduce<RuntimeUsage>((total, sample) => ({
    inputTokens: total.inputTokens + sample.usage.inputTokens,
    cachedInputTokens: total.cachedInputTokens + sample.usage.cachedInputTokens,
    cacheWriteTokens: total.cacheWriteTokens + sample.usage.cacheWriteTokens,
    outputTokens: total.outputTokens + sample.usage.outputTokens,
    reasoningTokens: total.reasoningTokens + sample.usage.reasoningTokens,
    totalTokens: total.totalTokens + sample.usage.totalTokens
  }), { inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0 })
  const passedCount = samples.filter((sample) => sample.passed).length
  const latencies = samples.map((sample) => sample.latencyMs)
  const requestIdSampleCount = samples.filter((sample) => sample.requestIds.length > 0).length
  const tokenUsageSampleCount = samples.filter((sample) => sample.usage.totalTokens > 0).length
  const costSampleCount = samples.filter((sample) => sample.estimatedCostUsd !== null).length
  const releaseChecks = {
    allCasesPassed: passedCount === samples.length,
    requestIdsComplete: requestIdSampleCount === samples.length,
    tokenUsageComplete: tokenUsageSampleCount === samples.length,
    costComplete: costSampleCount === samples.length
  }

  return {
    schemaVersion: 2,
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    mode: referencePlanner.mode,
    model: referencePlanner.model,
    caseCount: samples.length,
    passedCount,
    passRate: passedCount / samples.length,
    allCasesPassed: passedCount === samples.length,
    latency: {
      averageMs: Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length),
      p95Ms: percentile(latencies, 0.95)
    },
    usage: totalUsage,
    pricing,
    estimatedCostUsd: pricing ? round(samples.reduce((sum, sample) => sum + (sample.estimatedCostUsd ?? 0), 0)) : null,
    evidenceCoverage: {
      requestIds: requestIdSampleCount / samples.length,
      tokenUsage: tokenUsageSampleCount / samples.length,
      cost: costSampleCount / samples.length
    },
    releaseChecks,
    requestIds: [...new Set(samples.flatMap((sample) => sample.requestIds))],
    samples,
    releaseCandidate: referencePlanner.mode === 'openai' && Object.values(releaseChecks).every(Boolean)
  }
}
