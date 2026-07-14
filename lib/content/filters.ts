import type { InterviewQuestion, KnowledgePoint, PracticalProject } from './schemas'

export function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN').replace(/\s+/g, ' ')
}

function includesQuery(fields: string[], query: string): boolean {
  const normalized = normalizeQuery(query)
  if (!normalized) return true
  return normalizeQuery(fields.join(' ')).includes(normalized)
}

export function filterKnowledge(
  items: KnowledgePoint[],
  filters: { query?: string; category?: string; level?: string }
): KnowledgePoint[] {
  return items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false
    if (filters.level && item.level !== filters.level) return false
    return includesQuery([item.title, item.summary, item.category, item.level], filters.query ?? '')
  })
}

export function filterQuestions(
  items: InterviewQuestion[],
  filters: { query?: string; category?: string; level?: string; tag?: string }
): InterviewQuestion[] {
  return items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false
    if (filters.level && item.level !== filters.level) return false
    if (filters.tag && !item.tags.includes(filters.tag)) return false
    return includesQuery(
      [item.question, item.shortAnswer, item.category, item.level, ...item.tags],
      filters.query ?? ''
    )
  })
}

export function filterProjects(
  items: PracticalProject[],
  filters: { query?: string; level?: string; stack?: string }
): PracticalProject[] {
  return items.filter((item) => {
    if (filters.level && item.level !== filters.level) return false
    if (filters.stack && !item.stack.includes(filters.stack)) return false
    return includesQuery(
      [item.title, item.summary, item.level, ...item.stack],
      filters.query ?? ''
    )
  })
}
