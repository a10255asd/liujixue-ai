import { z } from 'zod'

import { estimateRuntimeCost, getRuntimeBaselinePricing } from './baseline'
import { runtimeToolNameSchema, type RuntimeUsage } from './contracts'
import { getRuntimeEvaluationCases } from './evaluation'

const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative()
})

const pricingSchema = z.object({
  currency: z.literal('USD'),
  inputPerMillion: z.number().nonnegative(),
  cachedInputPerMillion: z.number().nonnegative(),
  cacheWriteMultiplier: z.number().nonnegative(),
  outputPerMillion: z.number().nonnegative(),
  scope: z.string().min(1),
  capturedAt: z.string().min(1),
  source: z.string().url()
})

const sampleSchema = z.object({
  id: z.string().min(1),
  goal: z.string().min(8),
  expectedTools: z.array(runtimeToolNameSchema),
  actualTools: z.array(runtimeToolNameSchema),
  status: z.string(),
  passed: z.boolean(),
  checks: z.object({
    completed: z.boolean(),
    exactToolSequence: z.boolean(),
    allToolsSucceeded: z.boolean(),
    hasSummary: z.boolean()
  }),
  latencyMs: z.number().int().nonnegative(),
  usage: usageSchema,
  estimatedCostUsd: z.number().nonnegative().nullable(),
  requestIds: z.array(z.string().min(1)),
  failureReason: z.string().optional()
})

const reportSchema = z.object({
  schemaVersion: z.literal(2),
  generatedAt: z.string().datetime(),
  mode: z.literal('openai'),
  model: z.string().min(1),
  caseCount: z.number().int().positive(),
  passedCount: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(1),
  allCasesPassed: z.boolean(),
  latency: z.object({ averageMs: z.number().int().nonnegative(), p95Ms: z.number().int().nonnegative() }),
  usage: usageSchema,
  pricing: pricingSchema.nullable(),
  estimatedCostUsd: z.number().nonnegative().nullable(),
  evidenceCoverage: z.object({
    requestIds: z.number().min(0).max(1),
    tokenUsage: z.number().min(0).max(1),
    cost: z.number().min(0).max(1)
  }),
  releaseChecks: z.object({
    allCasesPassed: z.boolean(),
    requestIdsComplete: z.boolean(),
    tokenUsageComplete: z.boolean(),
    costComplete: z.boolean()
  }),
  requestIds: z.array(z.string().min(1)),
  samples: z.array(sampleSchema),
  releaseCandidate: z.boolean()
})

export type RuntimeBaselineVerificationCheck = {
  id: 'schema' | 'pricing' | 'case-set' | 'samples' | 'request-ids' | 'usage' | 'cost' | 'release-gate'
  passed: boolean
  detail: string
}

function equal(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function sumUsage(samples: Array<{ usage: RuntimeUsage }>) {
  return samples.reduce<RuntimeUsage>((total, sample) => ({
    inputTokens: total.inputTokens + sample.usage.inputTokens,
    cachedInputTokens: total.cachedInputTokens + sample.usage.cachedInputTokens,
    cacheWriteTokens: total.cacheWriteTokens + sample.usage.cacheWriteTokens,
    outputTokens: total.outputTokens + sample.usage.outputTokens,
    reasoningTokens: total.reasoningTokens + sample.usage.reasoningTokens,
    totalTokens: total.totalTokens + sample.usage.totalTokens
  }), { inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0 })
}

function rounded(value: number) {
  return Number(value.toFixed(8))
}

export function verifyRuntimeBaselineReport(input: unknown) {
  const parsed = reportSchema.safeParse(input)
  if (!parsed.success) {
    return {
      schemaVersion: 1 as const,
      valid: false,
      model: null,
      caseCount: 0,
      checks: [{ id: 'schema' as const, passed: false, detail: parsed.error.issues[0]?.message ?? '报告结构无效' }]
    }
  }

  const report = parsed.data
  const expectedCases = getRuntimeEvaluationCases()
  const expectedById = new Map(expectedCases.map((item) => [item.id, item]))
  const pricing = getRuntimeBaselinePricing(report.model)
  const caseSetMatches = equal(report.samples.map((sample) => sample.id), expectedCases.map((item) => item.id))
  const samplesPass = report.samples.every((sample) => {
    const expected = expectedById.get(sample.id)
    return Boolean(expected) && sample.goal === expected?.goal && equal(sample.expectedTools, expected?.expectedTools) &&
      equal(sample.actualTools, expected?.expectedTools) && sample.status === 'completed' && sample.passed &&
      Object.values(sample.checks).every(Boolean) && sample.usage.totalTokens > 0 && sample.requestIds.length > 0 &&
      sample.estimatedCostUsd === estimateRuntimeCost(sample.usage, pricing)
  })
  const sampleRequestIds = report.samples.flatMap((sample) => sample.requestIds)
  const uniqueRequestIds = [...new Set(sampleRequestIds)]
  const requestIdsPass = sampleRequestIds.length === uniqueRequestIds.length && equal(report.requestIds, uniqueRequestIds)
  const aggregateUsage = sumUsage(report.samples)
  const usagePass = equal(report.usage, aggregateUsage)
  const aggregateCost = pricing ? rounded(report.samples.reduce((sum, sample) => sum + (sample.estimatedCostUsd ?? 0), 0)) : null
  const costPass = report.estimatedCostUsd === aggregateCost
  const releaseGatePass = report.caseCount === expectedCases.length && report.passedCount === expectedCases.length &&
    report.passRate === 1 && report.allCasesPassed && report.releaseCandidate &&
    Object.values(report.releaseChecks).every(Boolean) && Object.values(report.evidenceCoverage).every((value) => value === 1)

  const checks: RuntimeBaselineVerificationCheck[] = [
    { id: 'schema', passed: true, detail: 'Schema v2 结构有效' },
    { id: 'pricing', passed: Boolean(pricing) && equal(report.pricing, pricing), detail: pricing ? '模型与版本化价格快照一致' : '模型没有受支持的价格快照' },
    { id: 'case-set', passed: caseSetMatches, detail: caseSetMatches ? '样本集合与仓库固定 20 例一致' : '样本缺失、重复或顺序发生变化' },
    { id: 'samples', passed: samplesPass, detail: samplesPass ? '逐样本工具、结果与证据完整' : '至少一个样本结果或证据不完整' },
    { id: 'request-ids', passed: requestIdsPass, detail: requestIdsPass ? 'request id 完整且不重复' : 'request id 缺失、重复或汇总不一致' },
    { id: 'usage', passed: usagePass, detail: usagePass ? 'Token 汇总可由样本重新计算' : 'Token 汇总与样本不一致' },
    { id: 'cost', passed: costPass, detail: costPass ? '成本可由 Token 和价格快照重新计算' : '成本与样本重算结果不一致' },
    { id: 'release-gate', passed: releaseGatePass, detail: releaseGatePass ? '20/20 与全部证据门禁通过' : '发布结论或覆盖率未达到门禁' }
  ]

  return {
    schemaVersion: 1 as const,
    valid: checks.every((check) => check.passed),
    model: report.model,
    caseCount: report.caseCount,
    checks
  }
}
