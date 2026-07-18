import { z } from 'zod'

import {
  documentSchema,
  evaluationCaseSchema,
  ingestRagDocuments,
  ragDocuments,
  ragEvaluationCases,
  type RagChunk
} from './rag-documents'
import { getChunkEmbedding, getStoredQueryEmbedding, ragVectorStore } from './rag-vectors'

export { documentSchema, evaluationCaseSchema, ingestRagDocuments }
export type { EvaluationCase, RagChunk, RagDocument } from './rag-documents'

export type RetrievalMode = 'keyword' | 'hybrid' | 'vector'

const documents = ragDocuments
const evaluationCases = ragEvaluationCases

export type RetrievalResult = RagChunk & {
  rank: number
  lexicalScore: number
  conceptScore: number
  vectorScore: number
  score: number
}

/**
 * 向量模式证据阈值：按真实向量校准（e5-small 的相关/无关余弦分数压缩在 0.86–0.94 窄带内，
 * 正例最低 top1 = 0.889、未知题最高 top1 = 0.871，取中间值 0.88）。
 * 阈值脆弱（间隔不足 0.02）本身就是学习点：小模型分数区间窄，拒答边界不如词面规则稳健。
 */
export const RAG_VECTOR_EVIDENCE_THRESHOLD = 0.88

const conceptAliases: Record<string, string[]> = {
  refund: ['退款', '退钱', '退回'],
  arrival: ['到账', '入账', '银行卡', '银行', '收到款'],
  overdue: ['超时', '超过', '还没收到', '仍未到账', '升级'],
  suspiciousLogin: ['异地登录', '陌生登录', '非本人', '不是本人', '账号被接管'],
  mfa: ['双重验证', '两步验证', 'mfa', '恢复码', '验证设备'],
  accountRecovery: ['找回账号', '账号申诉', '手机号停用', '手机号码停用', '无法接收验证码'],
  handlingTime: ['多久', '几天', '处理时效', '多长时间'],
  auditLog: ['审计日志', '审计记录', '操作日志', '日志'],
  export: ['导出', '导成', 'csv', 'json'],
  retention: ['保留', '保存多久', '留存'],
  securityIncident: ['数据泄露', '安全事件', '严重安全'],
  responseTime: ['首次响应', '响应时间', '多久响应'],
  ownership: ['所有权', '所有者', '转让', '转移'],
  permissions: ['管理员', '权限', '角色'],
  deletion: ['删除', '清除', '注销空间'],
  recoveryWindow: ['恢复多长时间', '可恢复期', '还能恢复'],
  rateLimit: ['429', '限流', '频率限制', '请求过多'],
  retry: ['重试', '退避', 'backoff'],
  pricing: ['价格', '多少钱', '费用', '月费']
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s，。！？、；：,.!?;:（）()【】\[\]“”"'·×]/g, '')
}

function ngrams(value: string) {
  const normalized = normalize(value)
  const grams = new Set<string>()
  const latinTokens = value.toLowerCase().match(/[a-z0-9-]+/g) ?? []
  latinTokens.forEach((token) => grams.add(token))
  for (let index = 0; index < normalized.length - 1; index += 1) {
    grams.add(normalized.slice(index, index + 2))
  }
  return grams
}

function overlap(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0
  let matches = 0
  left.forEach((token) => {
    if (right.has(token)) matches += 1
  })
  return matches / left.size
}

function weightedLexicalOverlap(queryGrams: Set<string>, chunkGrams: Set<string>, corpusGrams: Set<string>[]) {
  if (!queryGrams.size) return 0
  let matchedWeight = 0
  let totalWeight = 0

  queryGrams.forEach((token) => {
    const documentFrequency = corpusGrams.filter((grams) => grams.has(token)).length
    const weight = Math.log((corpusGrams.length + 1) / (documentFrequency + 1)) + 1
    totalWeight += weight
    if (chunkGrams.has(token)) matchedWeight += weight
  })

  return totalWeight ? matchedWeight / totalWeight : 0
}

function extractConcepts(value: string) {
  const normalized = normalize(value)
  return new Set(
    Object.entries(conceptAliases)
      .filter(([, aliases]) => aliases.some((alias) => normalized.includes(normalize(alias))))
      .map(([concept]) => concept)
  )
}

function conceptOverlap(query: string, chunk: RagChunk) {
  const queryConcepts = extractConcepts(query)
  if (!queryConcepts.size) return 0
  const chunkConcepts = extractConcepts(`${chunk.heading} ${chunk.text} ${chunk.tags.join(' ')}`)
  return overlap(queryConcepts, chunkConcepts)
}

export const ragChunks = ingestRagDocuments()

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length) {
    throw new Error(`余弦相似度要求维度一致：${left.length} vs ${right.length}`)
  }
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index]
    leftNorm += left[index] * left[index]
    rightNorm += right[index] * right[index]
  }
  if (!leftNorm || !rightNorm) return 0
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

export type RetrievalOptions = {
  /** vector 模式必需：与 rag-vectors.json 同一模型、同一 query 前缀生成的查询向量。 */
  queryEmbedding?: number[]
}

export function retrieveChunks(query: string, mode: RetrievalMode = 'hybrid', limit = 3, options: RetrievalOptions = {}) {
  if (mode === 'vector' && !options.queryEmbedding) {
    throw new Error('vector 模式需要 queryEmbedding（浏览器端本地生成，或评估题的构建期向量）')
  }

  const queryGrams = ngrams(query)
  const corpusGrams = ragChunks.map((chunk) => ngrams(`${chunk.heading}${chunk.text}${chunk.tags.join('')}`))
  const ranked = ragChunks.map((chunk, index) => {
    const lexicalScore = mode === 'keyword'
      ? overlap(queryGrams, corpusGrams[index])
      : weightedLexicalOverlap(queryGrams, corpusGrams[index], corpusGrams)
    const conceptScore = conceptOverlap(query, chunk)
    const vectorScore = mode === 'vector'
      ? cosineSimilarity(options.queryEmbedding as number[], getChunkEmbedding(chunk.id))
      : 0
    const score = mode === 'vector'
      ? vectorScore
      : mode === 'hybrid'
        ? lexicalScore * 0.58 + conceptScore * 0.42
        : lexicalScore

    return {
      ...chunk,
      lexicalScore: round(lexicalScore),
      conceptScore: round(conceptScore),
      vectorScore: round(vectorScore),
      score: round(score)
    }
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))

  return ranked.slice(0, Math.max(1, limit)).map((result, index) => ({ ...result, rank: index + 1 }))
}

export function answerWithCitations(query: string, mode: RetrievalMode = 'hybrid', options: RetrievalOptions = {}) {
  const results = retrieveChunks(query, mode, 3, options)
  const top = results[0]
  const hasEvidence = mode === 'vector'
    ? Boolean(top && top.score >= RAG_VECTOR_EVIDENCE_THRESHOLD)
    : Boolean(top && top.score >= 0.18 && (top.lexicalScore >= 0.08 || top.conceptScore >= 0.25))

  if (!hasEvidence) {
    return {
      query,
      mode,
      hasEvidence: false,
      answer: '当前知识库没有足够证据回答这个问题。请补充资料或换一种更具体的问法。',
      citations: [] as RetrievalResult[],
      candidates: results
    }
  }

  const citations = results.filter((result) => result.score >= Math.max(0.16, top.score * 0.48)).slice(0, 2)
  const answer = citations
    .map((citation, index) => `${citation.text} [${index + 1}]`)
    .join('\n\n')

  return { query, mode, hasEvidence: true, answer, citations, candidates: results }
}

const modeLabels: Record<RetrievalMode, string> = {
  keyword: '关键词基线',
  hybrid: '混合检索',
  vector: '向量（本地模型）'
}

export function evaluateRetriever(mode: RetrievalMode) {
  const positiveCases = evaluationCases.filter((item) => item.relevantChunkIds.length > 0)
  const negativeCases = evaluationCases.filter((item) => item.relevantChunkIds.length === 0)
  const cases = evaluationCases.map((item) => {
    // vector 模式使用构建期为每条评估题固化的查询向量，保证评估完全离线可复现。
    const options: RetrievalOptions = mode === 'vector'
      ? { queryEmbedding: getStoredQueryEmbedding(item.id) }
      : {}
    const response = answerWithCitations(item.query, mode, options)
    const expected = new Set(item.relevantChunkIds)
    const firstRelevantIndex = response.candidates.findIndex((result) => expected.has(result.id))
    const hitAt3 = expected.size === 0 ? !response.hasEvidence : firstRelevantIndex >= 0 && firstRelevantIndex < 3
    const reciprocalRank = expected.size > 0 && firstRelevantIndex >= 0 ? 1 / (firstRelevantIndex + 1) : 0
    const citationHit = expected.size === 0
      ? !response.hasEvidence
      : response.citations.some((citation) => expected.has(citation.id))

    return { ...item, response, hitAt3, reciprocalRank, citationHit }
  })

  const positiveResults = cases.filter((item) => item.relevantChunkIds.length > 0)
  const negativeResults = cases.filter((item) => item.relevantChunkIds.length === 0)

  return {
    mode,
    label: modeLabels[mode],
    hitAt3: round(positiveResults.filter((item) => item.hitAt3).length / positiveCases.length, 3),
    mrr: round(positiveResults.reduce((sum, item) => sum + item.reciprocalRank, 0) / positiveCases.length, 3),
    citationCoverage: round(positiveResults.filter((item) => item.citationHit).length / positiveCases.length, 3),
    unknownRejectionRate: negativeCases.length
      ? round(negativeResults.filter((item) => item.hitAt3).length / negativeResults.length, 3)
      : 1,
    cases
  }
}

export function getRagPrototypeData() {
  return {
    documents,
    chunks: ragChunks,
    evaluationCases,
    vectorModel: {
      model: ragVectorStore.model,
      dtype: ragVectorStore.dtype,
      dimensions: ragVectorStore.dimensions,
      generatedAt: ragVectorStore.generatedAt
    },
    reports: [evaluateRetriever('keyword'), evaluateRetriever('hybrid'), evaluateRetriever('vector')]
  }
}

export type RagEvaluationReport = ReturnType<typeof evaluateRetriever>

export const ragEvaluationSnapshotSchema = z.object({
  generatedAt: z.string().datetime({ offset: true }),
  model: z.string().min(1),
  dimensions: z.number().int().positive(),
  caseCount: z.number().int().positive(),
  reports: z.array(z.object({
    mode: z.enum(['keyword', 'hybrid', 'vector']),
    label: z.string().min(1),
    hitAt3: z.number().min(0).max(1),
    mrr: z.number().min(0).max(1),
    citationCoverage: z.number().min(0).max(1),
    unknownRejectionRate: z.number().min(0).max(1)
  })).length(3)
})

export type RagEvaluationSnapshot = z.infer<typeof ragEvaluationSnapshotSchema>

/**
 * 对比固化快照与实时计算的三路评估报告，返回不一致项（空数组 = 一致）。
 * 供 validate:content 与单测防止快照漂移。
 */
export function diffEvaluationSnapshot(snapshot: RagEvaluationSnapshot, reports: RagEvaluationReport[]): string[] {
  const errors: string[] = []
  const metrics = ['hitAt3', 'mrr', 'citationCoverage', 'unknownRejectionRate'] as const

  for (const mode of ['keyword', 'hybrid', 'vector'] as const) {
    const recorded = snapshot.reports.find((report) => report.mode === mode)
    const live = reports.find((report) => report.mode === mode)
    if (!recorded || !live) {
      errors.push(`快照或实时报告缺少模式：${mode}`)
      continue
    }
    for (const metric of metrics) {
      if (recorded[metric] !== live[metric]) {
        errors.push(`${mode}.${metric} 不一致：快照 ${recorded[metric]} vs 实时 ${live[metric]}`)
      }
    }
  }

  return errors
}
