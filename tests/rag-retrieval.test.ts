import assert from 'node:assert/strict'
import test from 'node:test'

import { answerWithCitations, evaluateRetriever, getRagPrototypeData, ingestRagDocuments, retrieveChunks } from '../lib/labs/rag-retrieval'

test('RAG ingestion creates stable section chunks with source metadata', () => {
  const data = getRagPrototypeData()
  const chunks = ingestRagDocuments(data.documents)

  assert.equal(data.documents.length, 8)
  assert.equal(chunks.length, 16)
  assert.equal(new Set(chunks.map((chunk) => chunk.id)).size, chunks.length)
  assert.ok(chunks.every((chunk) => chunk.documentId && chunk.documentTitle && chunk.version && chunk.position > 0))
})

test('hybrid retrieval ranks the expected evidence for representative queries', () => {
  assert.equal(retrieveChunks('银行卡退款七个工作日还没到账怎么升级？')[0]?.id, 'refund-escalation')
  assert.ok(['ownership-transfer', 'role-permissions'].includes(retrieveChunks('管理员能否直接转让团队所有权？')[0]?.id ?? ''))
  assert.equal(retrieveChunks('接口出现 429 如何安全重试？')[0]?.id, 'api-retry-policy')
})

test('RAG answers carry stable citations and reject unsupported pricing questions', () => {
  const supported = answerWithCitations('企业版的操作日志保存多久？')
  assert.equal(supported.hasEvidence, true)
  assert.equal(supported.citations[0]?.id, 'audit-retention')
  assert.match(supported.answer, /\[1\]/)

  const unsupported = answerWithCitations('个人专业版每个月具体多少钱？')
  assert.equal(unsupported.hasEvidence, false)
  assert.equal(unsupported.citations.length, 0)
  assert.match(unsupported.answer, /没有足够证据/)
})

test('retrieval evaluation exposes reproducible quality and failure-boundary metrics', () => {
  const keyword = evaluateRetriever('keyword')
  const hybrid = evaluateRetriever('hybrid')

  assert.equal(keyword.cases.length, 13)
  assert.equal(hybrid.cases.length, 13)
  assert.ok(hybrid.hitAt3 >= keyword.hitAt3)
  assert.ok(hybrid.mrr >= keyword.mrr)
  assert.ok(hybrid.hitAt3 >= 0.9)
  assert.ok(hybrid.mrr >= 0.85)
  assert.equal(hybrid.unknownRejectionRate, 1)
})
