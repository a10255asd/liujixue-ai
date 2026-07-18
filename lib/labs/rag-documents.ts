import { z } from 'zod'

import documentData from '@/content/labs/rag-documents.json'
import evaluationData from '@/content/labs/rag-evaluation.json'

export const sectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  text: z.string().min(20),
  tags: z.array(z.string().min(1)).min(1)
})

export const documentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  version: z.string().min(1),
  updatedAt: z.string().date(),
  sections: z.array(sectionSchema).min(1)
})

export const evaluationCaseSchema = z.object({
  id: z.string().min(1),
  query: z.string().min(2),
  relevantChunkIds: z.array(z.string().min(1))
})

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

export const ragDocuments = z.array(documentSchema).min(1).parse(documentData)
export const ragEvaluationCases = z.array(evaluationCaseSchema).min(10).parse(evaluationData)

export function ingestRagDocuments(source: RagDocument[] = ragDocuments) {
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
