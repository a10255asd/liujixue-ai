import { getInterviewQuestionById, getKnowledgeBySlug } from './repository'
import type { InterviewQuestion, KnowledgePoint } from './schemas'

/**
 * lab slug → 关联知识点 / 面试题的集中声明。
 * 只引用 content/*.json 中真实存在且为 published 的 slug / id，
 * 引用完整性由 tests/lab-relations.test.ts 保证。
 */
export const labContentRelations = {
  'prompt-regression': {
    knowledge: ['prompt-contract', 'structured-outputs', 'few-shot-prompting', 'cost-latency-budget'],
    questions: ['prompt-contract-design', 'structured-output-vs-json-mode', 'prompt-versioning', 'temperature-and-determinism']
  },
  'rag-retrieval': {
    knowledge: ['chunking-strategy', 'hybrid-search', 'rag-citations', 'rag-evaluation'],
    questions: ['rag-chunking', 'hybrid-search-design', 'rag-citation-fidelity', 'rag-evaluation']
  },
  'controlled-agent': {
    knowledge: ['agent-loop', 'tool-contract-design', 'human-in-the-loop', 'production-reliability'],
    questions: ['agent-loop-control', 'agent-tool-permissions', 'human-in-the-loop', 'agent-idempotency-event-log']
  },
  'agent-evaluation': {
    knowledge: ['agent-evaluation', 'agent-tracing', 'agent-stop-conditions'],
    questions: ['agent-evaluation', 'tool-call-evaluation', 'eval-regression-gate', 'eval-dataset-design']
  },
  'mcp-tools': {
    knowledge: ['mcp-architecture', 'mcp-primitives', 'mcp-security'],
    questions: ['what-is-mcp', 'mcp-architecture-question', 'mcp-primitives', 'mcp-security']
  }
} as const

export type LabSlug = keyof typeof labContentRelations

export function getLabRelatedKnowledge(slug: LabSlug): KnowledgePoint[] {
  return labContentRelations[slug].knowledge.flatMap((item) => {
    const knowledge = getKnowledgeBySlug(item)
    return knowledge ? [knowledge] : []
  })
}

export function getLabRelatedQuestions(slug: LabSlug): InterviewQuestion[] {
  return labContentRelations[slug].questions.flatMap((id) => {
    const question = getInterviewQuestionById(id)
    return question ? [question] : []
  })
}
