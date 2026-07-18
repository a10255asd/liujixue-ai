import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { env, pipeline } from '@huggingface/transformers'

import { ingestRagDocuments, ragDocuments, ragEvaluationCases } from '../lib/labs/rag-documents'
import { computeRagDocumentsHash, computeRagEvaluationHash } from '../lib/labs/rag-vector-hash'

/**
 * 构建期生成 content/labs/rag-vectors.json：
 * 用本地开源多语言 embedding 模型（q8 量化）为全部章节块与固定评估题生成向量。
 * 需要联网下载模型；国内网络可用 HF_ENDPOINT=https://hf-mirror.com 镜像。
 * 文档块或评估题内容变化后必须重跑本脚本（validate:content 会通过 hash 强制）。
 *
 * 注意：不能在文件生成前静态导入 lib/labs/rag-vectors（它会解析输出文件），
 * 因此 schema 自检在写入后通过动态 import 完成。
 */

const MODEL_ID = 'Xenova/multilingual-e5-small'
const DTYPE = 'q8' as const
const QUERY_PREFIX = 'query: '
const PASSAGE_PREFIX = 'passage: '
const TEXT_TEMPLATE = 'passage: {heading}\\n{text}（章节标题 + 正文）；query: {query}（评估题原句）'
const OUTPUT_PATH = join(process.cwd(), 'content/labs/rag-vectors.json')

function round(value: number, digits = 6) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

if (process.env.HF_ENDPOINT) {
  env.remoteHost = process.env.HF_ENDPOINT
  console.log(`使用镜像下载模型：${env.remoteHost}`)
}

const chunks = ingestRagDocuments(ragDocuments)
console.log(`加载模型 ${MODEL_ID}（${DTYPE}）…`)
const extractor = await pipeline('feature-extraction', MODEL_ID, { dtype: DTYPE })

async function embed(texts: string[]) {
  const output = await extractor(texts, { pooling: 'mean', normalize: true })
  const [count, dimension] = output.dims as [number, number]
  const data = output.data as Float32Array
  const rows: number[][] = []
  for (let index = 0; index < count; index += 1) {
    rows.push(Array.from(data.slice(index * dimension, (index + 1) * dimension), (value) => round(value)))
  }
  return rows
}

console.log(`为 ${chunks.length} 个章节块生成 passage 向量…`)
const chunkEmbeddings = await embed(chunks.map((chunk) => `${PASSAGE_PREFIX}${chunk.heading}\n${chunk.text}`))

console.log(`为 ${ragEvaluationCases.length} 条评估题生成 query 向量…`)
const queryEmbeddings = await embed(ragEvaluationCases.map((item) => `${QUERY_PREFIX}${item.query}`))

const dimensions = chunkEmbeddings[0]?.length ?? 0
const store = {
  model: MODEL_ID,
  dtype: DTYPE,
  dimensions,
  generatedAt: new Date().toISOString(),
  queryPrefix: QUERY_PREFIX,
  passagePrefix: PASSAGE_PREFIX,
  textTemplate: TEXT_TEMPLATE,
  documentsHash: computeRagDocumentsHash(ragDocuments),
  evaluationHash: computeRagEvaluationHash(ragEvaluationCases),
  chunks: chunks.map((chunk, index) => ({ id: chunk.id, embedding: chunkEmbeddings[index] })),
  queries: ragEvaluationCases.map((item, index) => ({ id: item.id, embedding: queryEmbeddings[index] }))
}

function serializeVectorStore(value: typeof store) {
  const entry = (item: { id: string; embedding: number[] }) =>
    `    { "id": ${JSON.stringify(item.id)}, "embedding": [${item.embedding.join(', ')}] }`
  return [
    '{',
    `  "model": ${JSON.stringify(value.model)},`,
    `  "dtype": ${JSON.stringify(value.dtype)},`,
    `  "dimensions": ${value.dimensions},`,
    `  "generatedAt": ${JSON.stringify(value.generatedAt)},`,
    `  "queryPrefix": ${JSON.stringify(value.queryPrefix)},`,
    `  "passagePrefix": ${JSON.stringify(value.passagePrefix)},`,
    `  "textTemplate": ${JSON.stringify(value.textTemplate)},`,
    `  "documentsHash": ${JSON.stringify(value.documentsHash)},`,
    `  "evaluationHash": ${JSON.stringify(value.evaluationHash)},`,
    '  "chunks": [',
    value.chunks.map(entry).join(',\n'),
    '  ],',
    '  "queries": [',
    value.queries.map(entry).join(',\n'),
    '  ]',
    '}',
    ''
  ].join('\n')
}

writeFileSync(OUTPUT_PATH, serializeVectorStore(store))
console.log(`已写入 ${OUTPUT_PATH}（${store.chunks.length} 章节块 + ${store.queries.length} 评估题，${dimensions} 维）`)

// 写入后用 Zod schema 与覆盖校验自检（此刻 rag-vectors.json 已存在，可以安全动态导入）。
const { ragVectorStoreSchema, validateRagVectorStoreCoverage } = await import('../lib/labs/rag-vectors')
const parsed = ragVectorStoreSchema.parse(store)
const coverageErrors = validateRagVectorStoreCoverage(
  parsed,
  chunks.map((chunk) => chunk.id),
  ragEvaluationCases.map((item) => item.id)
)
if (coverageErrors.length) {
  throw new Error(`向量库自检失败：\n${coverageErrors.join('\n')}`)
}

// 向量变化会影响向量模式评估指标，同步固化三路对比快照。
const { writeRagEvaluationSnapshot } = await import('./build-rag-evaluation')
await writeRagEvaluationSnapshot()
