import { z } from 'zod'

import documentData from '@/content/labs/rag-documents.json'
import evaluationData from '@/content/labs/rag-evaluation.json'

const sectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  text: z.string().min(20),
  tags: z.array(z.string().min(1)).min(1)
})

const documentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  version: z.string().min(1),
  updatedAt: z.string().date(),
  sections: z.array(sectionSchema).min(1)
})

const evaluationCaseSchema = z.object({
  id: z.string().min(1),
  query: z.string().min(2),
  relevantChunkIds: z.array(z.string().min(1))
})

export type RetrievalMode = 'keyword' | 'hybrid'
export type RagDocument = z.infer<typeof documentSchema>
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>

export type RagChunk = {
  id: string
  documentId: string
  documentTitle: string
  version: string
  heading: string
  text: string
  tags: string[]
  position: number
}

export type RetrievalResult = RagChunk & {
  rank: number
  lexicalScore: number
  conceptScore: number
  score: number
}

const documents = z.array(documentSchema).min(1).parse(documentData)
const evaluationCases = z.array(evaluationCaseSchema).min(10).parse(evaluationData)

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

export function ingestRagDocuments(source: RagDocument[] = documents) {
  return source.flatMap((document) => document.sections.map((section, index) => ({
    id: section.id,
    documentId: document.id,
    documentTitle: document.title,
    version: document.version,
    heading: section.heading,
    text: section.text,
    tags: section.tags,
    position: index + 1
  })))
}

export const ragChunks = ingestRagDocuments()

export function retrieveChunks(query: string, mode: RetrievalMode = 'hybrid', limit = 3) {
  const queryGrams = ngrams(query)
  const corpusGrams = ragChunks.map((chunk) => ngrams(`${chunk.heading}${chunk.text}${chunk.tags.join('')}`))
  const ranked = ragChunks.map((chunk, index) => {
    const lexicalScore = mode === 'hybrid'
      ? weightedLexicalOverlap(queryGrams, corpusGrams[index], corpusGrams)
      : overlap(queryGrams, corpusGrams[index])
    const conceptScore = conceptOverlap(query, chunk)
    const score = mode === 'hybrid'
      ? lexicalScore * 0.58 + conceptScore * 0.42
      : lexicalScore

    return { ...chunk, lexicalScore: round(lexicalScore), conceptScore: round(conceptScore), score: round(score) }
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))

  return ranked.slice(0, Math.max(1, limit)).map((result, index) => ({ ...result, rank: index + 1 }))
}

export function answerWithCitations(query: string, mode: RetrievalMode = 'hybrid') {
  const results = retrieveChunks(query, mode, 3)
  const top = results[0]
  const hasEvidence = Boolean(top && top.score >= 0.18 && (top.lexicalScore >= 0.08 || top.conceptScore >= 0.25))

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

export function evaluateRetriever(mode: RetrievalMode) {
  const positiveCases = evaluationCases.filter((item) => item.relevantChunkIds.length > 0)
  const negativeCases = evaluationCases.filter((item) => item.relevantChunkIds.length === 0)
  const cases = evaluationCases.map((item) => {
    const response = answerWithCitations(item.query, mode)
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
    label: mode === 'hybrid' ? '混合检索' : '关键词基线',
    hitAt3: round(positiveResults.filter((item) => item.hitAt3).length / positiveCases.length, 3),
    mrr: round(positiveResults.reduce((sum, item) => sum + item.reciprocalRank, 0) / positiveCases.length, 3),
    citationCoverage: round(positiveResults.filter((item) => item.citationHit).length / positiveCases.length, 3),
    unknownRejectionRate: negativeCases.length
      ? round(negativeResults.filter((item) => item.hitAt3).length / negativeCases.length, 3)
      : 1,
    cases
  }
}

export function getRagPrototypeData() {
  return {
    documents,
    chunks: ragChunks,
    evaluationCases,
    reports: [evaluateRetriever('keyword'), evaluateRetriever('hybrid')]
  }
}

export type RagEvaluationReport = ReturnType<typeof evaluateRetriever>
