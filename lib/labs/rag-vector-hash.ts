import { createHash } from 'node:crypto'

import type { EvaluationCase, RagDocument } from './rag-documents'
import { ingestRagDocuments } from './rag-documents'

/**
 * 文档块 / 评估题内容的稳定性指纹。
 * 任一章节块或评估题的文本变化都会改变 hash，
 * validate:content 借此强制重新生成 content/labs/rag-vectors.json。
 *
 * 仅在 Node 环境（构建脚本、校验脚本、单测）使用，不要导入浏览器 bundle。
 */
export function computeRagDocumentsHash(documents: RagDocument[]): string {
  const canonical = ingestRagDocuments(documents)
    .map((chunk) => `${chunk.id}${chunk.heading}${chunk.text}${chunk.tags.join(',')}`)
    .join('\n')
  return createHash('sha256').update(canonical).digest('hex')
}

export function computeRagEvaluationHash(cases: EvaluationCase[]): string {
  const canonical = cases
    .map((item) => `${item.id}${item.query}${[...item.relevantChunkIds].sort().join(',')}`)
    .join('\n')
  return createHash('sha256').update(canonical).digest('hex')
}
