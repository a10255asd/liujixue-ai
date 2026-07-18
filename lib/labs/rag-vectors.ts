import { z } from 'zod'

import vectorData from '@/content/labs/rag-vectors.json'

const vectorEntrySchema = z.object({
  id: z.string().min(1),
  embedding: z.array(z.number().finite()).min(1)
})

export const ragVectorStoreSchema = z.object({
  model: z.string().min(1),
  dtype: z.literal('q8'),
  dimensions: z.number().int().positive(),
  generatedAt: z.string().datetime({ offset: true }),
  queryPrefix: z.string(),
  passagePrefix: z.string(),
  textTemplate: z.string().min(1),
  documentsHash: z.string().regex(/^[a-f0-9]{64}$/),
  evaluationHash: z.string().regex(/^[a-f0-9]{64}$/),
  chunks: z.array(vectorEntrySchema).min(1),
  queries: z.array(vectorEntrySchema).min(1)
})

export type RagVectorStore = z.infer<typeof ragVectorStoreSchema>

/**
 * 构建期生成的向量库快照。文档块向量随站点静态分发；
 * 查询向量在浏览器端用同一模型本地生成（见 components/labs/rag-vector-embedder.ts）。
 */
export const ragVectorStore: RagVectorStore = ragVectorStoreSchema.parse(vectorData)

export const RAG_VECTOR_MODEL_ID = ragVectorStore.model
export const RAG_VECTOR_DIMENSIONS = ragVectorStore.dimensions

const chunkVectorMap = new Map(ragVectorStore.chunks.map((entry) => [entry.id, entry.embedding]))
const queryVectorMap = new Map(ragVectorStore.queries.map((entry) => [entry.id, entry.embedding]))

export function getChunkEmbedding(chunkId: string) {
  const embedding = chunkVectorMap.get(chunkId)
  if (!embedding) throw new Error(`向量库缺少章节块：${chunkId}，请重新运行 npm run build:rag-vectors`)
  return embedding
}

/** 固定评估题的构建期查询向量，仅供 Node 端离线评估复现使用。 */
export function getStoredQueryEmbedding(caseId: string) {
  const embedding = queryVectorMap.get(caseId)
  if (!embedding) throw new Error(`向量库缺少评估题：${caseId}，请重新运行 npm run build:rag-vectors`)
  return embedding
}

/**
 * 结构性校验：维度一致、章节块全覆盖、评估题全覆盖。
 * 返回错误列表（空数组 = 通过），供 validate:content 与单测共用。
 * 内容 hash 一致性校验在 lib/labs/rag-vector-hash.ts（Node 专用）。
 */
export function validateRagVectorStoreCoverage(
  store: RagVectorStore,
  expectedChunkIds: string[],
  expectedCaseIds: string[]
): string[] {
  const errors: string[] = []
  const entries = [...store.chunks, ...store.queries]

  for (const entry of entries) {
    if (entry.embedding.length !== store.dimensions) {
      errors.push(`向量 ${entry.id} 维度 ${entry.embedding.length} 与声明维度 ${store.dimensions} 不一致`)
    }
  }

  const chunkIds = new Set(store.chunks.map((entry) => entry.id))
  if (chunkIds.size !== store.chunks.length) errors.push('章节块向量存在重复 id')
  for (const id of expectedChunkIds) {
    if (!chunkIds.has(id)) errors.push(`向量库缺少章节块：${id}`)
  }
  for (const id of chunkIds) {
    if (!expectedChunkIds.includes(id)) errors.push(`向量库包含多余章节块：${id}`)
  }

  const queryIds = new Set(store.queries.map((entry) => entry.id))
  if (queryIds.size !== store.queries.length) errors.push('评估题向量存在重复 id')
  for (const id of expectedCaseIds) {
    if (!queryIds.has(id)) errors.push(`向量库缺少评估题：${id}`)
  }
  for (const id of queryIds) {
    if (!expectedCaseIds.includes(id)) errors.push(`向量库包含多余评估题：${id}`)
  }

  return errors
}
