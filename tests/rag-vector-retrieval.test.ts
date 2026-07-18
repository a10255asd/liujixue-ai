import assert from 'node:assert/strict'
import test from 'node:test'

import evaluationSnapshotData from '../content/labs/rag-evaluation-report.json'
import { ragDocuments, ragEvaluationCases, ingestRagDocuments } from '../lib/labs/rag-documents'
import { computeRagDocumentsHash, computeRagEvaluationHash } from '../lib/labs/rag-vector-hash'
import {
  getChunkEmbedding,
  getStoredQueryEmbedding,
  ragVectorStore,
  ragVectorStoreSchema,
  validateRagVectorStoreCoverage
} from '../lib/labs/rag-vectors'
import {
  answerWithCitations,
  cosineSimilarity,
  diffEvaluationSnapshot,
  evaluateRetriever,
  getRagPrototypeData,
  ragEvaluationSnapshotSchema,
  retrieveChunks,
  RAG_VECTOR_EVIDENCE_THRESHOLD
} from '../lib/labs/rag-retrieval'

test('cosineSimilarity ranks directions correctly and rejects dimension mismatch', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1)
  assert.equal(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0)
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1)
  assert.ok(Math.abs(cosineSimilarity([3, 4], [4, 3]) - 24 / 25) < 1e-9)
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0)
  assert.throws(() => cosineSimilarity([1, 0], [1, 0, 0]), /维度一致/)
})

test('vector mode sorts chunks by cosine similarity against stored passage vectors', () => {
  // 构造一个恰好等于目标章节块向量的查询向量：目标块必须以相似度 1 排到第一。
  const target = getChunkEmbedding('audit-retention')
  const results = retrieveChunks('任意查询文本不参与向量打分', 'vector', 3, { queryEmbedding: target })

  assert.equal(results[0]?.id, 'audit-retention')
  assert.equal(results[0]?.score, 1)
  assert.ok(results[0].score > (results[1]?.score ?? -1))
  assert.ok(results.every((result) => Math.abs(result.score - result.vectorScore) < 1e-9))
})

test('vector mode requires a query embedding and keeps lexical/concept trace fields', () => {
  assert.throws(() => retrieveChunks('退款多久到账？', 'vector'), /queryEmbedding/)

  const results = retrieveChunks('退款成功后银行卡多久能到账？', 'vector', 3, {
    queryEmbedding: getStoredQueryEmbedding('refund-window')
  })
  assert.equal(results[0]?.id, 'refund-arrival-window')
  // 词面/概念分仍计算，供 Top 3 轨迹对照展示
  assert.ok(results.every((result) => Number.isFinite(result.lexicalScore) && Number.isFinite(result.conceptScore)))
})

test('vector mode integrates with citation answering and evidence-based rejection', () => {
  const supported = answerWithCitations('企业版的操作日志可以在线保存多久？', 'vector', {
    queryEmbedding: getStoredQueryEmbedding('audit-days')
  })
  assert.equal(supported.hasEvidence, true)
  assert.equal(supported.citations[0]?.id, 'audit-retention')
  assert.match(supported.answer, /\[1\]/)
  assert.ok(supported.candidates[0]!.score >= RAG_VECTOR_EVIDENCE_THRESHOLD)

  const unsupported = answerWithCitations('个人专业版每个月具体多少钱？', 'vector', {
    queryEmbedding: getStoredQueryEmbedding('unknown-pricing')
  })
  assert.equal(unsupported.hasEvidence, false)
  assert.equal(unsupported.citations.length, 0)
  assert.match(unsupported.answer, /没有足够证据/)
  assert.ok(unsupported.candidates[0]!.score < RAG_VECTOR_EVIDENCE_THRESHOLD)
})

test('rag-vectors.json passes schema and coverage validation', () => {
  const store = ragVectorStoreSchema.parse(ragVectorStore)
  assert.ok(store.model.includes('/'))
  assert.equal(store.dtype, 'q8')
  assert.equal(store.dimensions, 384)

  const chunks = ingestRagDocuments(ragDocuments)
  const errors = validateRagVectorStoreCoverage(
    store,
    chunks.map((chunk) => chunk.id),
    ragEvaluationCases.map((item) => item.id)
  )
  assert.deepEqual(errors, [])
  assert.equal(store.chunks.length, 16)
  assert.equal(store.queries.length, 13)
})

test('vector store hashes match current document and evaluation content', () => {
  assert.equal(ragVectorStore.documentsHash, computeRagDocumentsHash(ragDocuments))
  assert.equal(ragVectorStore.evaluationHash, computeRagEvaluationHash(ragEvaluationCases))
})

test('coverage validator flags missing chunks and inconsistent dimensions', () => {
  const errors = validateRagVectorStoreCoverage(
    {
      ...ragVectorStore,
      chunks: ragVectorStore.chunks.slice(1),
      queries: [
        { id: ragVectorStore.queries[0]!.id, embedding: [0.1, 0.2] },
        ...ragVectorStore.queries.slice(1)
      ]
    },
    ingestRagDocuments(ragDocuments).map((chunk) => chunk.id),
    ragEvaluationCases.map((item) => item.id)
  )
  assert.ok(errors.some((error) => error.includes('缺少章节块')))
  assert.ok(errors.some((error) => error.includes('维度')))
})

test('three-way evaluation snapshot stays in sync with live computation', () => {
  const snapshot = ragEvaluationSnapshotSchema.parse(evaluationSnapshotData)
  const { reports } = getRagPrototypeData()

  assert.equal(reports.length, 3)
  assert.equal(snapshot.caseCount, 13)
  assert.deepEqual(diffEvaluationSnapshot(snapshot, reports), [])

  const vector = reports.find((report) => report.mode === 'vector')
  assert.ok(vector)
  assert.equal(vector.cases.length, 13)
  for (const metric of [vector.hitAt3, vector.mrr, vector.citationCoverage, vector.unknownRejectionRate]) {
    assert.ok(metric >= 0 && metric <= 1)
  }

  const drifted = {
    ...snapshot,
    reports: snapshot.reports.map((report) => (report.mode === 'vector' ? { ...report, mrr: 0 } : report))
  }
  assert.ok(diffEvaluationSnapshot(drifted, reports).some((error) => error.includes('vector.mrr')))
})

test('vector mode evaluation matches hybrid on the fixed set while keeping a fragile rejection margin', () => {
  const vector = evaluateRetriever('vector')
  assert.equal(vector.hitAt3, 1)
  assert.equal(vector.mrr, 1)
  assert.equal(vector.citationCoverage, 1)
  assert.equal(vector.unknownRejectionRate, 1)

  // 诚实记录：向量分数带窄，拒答边界间隔不足 0.02，阈值是校准出来的脆弱边界。
  const unknown = vector.cases.find((item) => item.id === 'unknown-pricing')
  const weakestPositive = Math.min(
    ...vector.cases.filter((item) => item.relevantChunkIds.length > 0).map((item) => item.response.candidates[0]!.score)
  )
  assert.ok(unknown)
  assert.ok(weakestPositive - unknown.response.candidates[0]!.score < 0.02)
})
