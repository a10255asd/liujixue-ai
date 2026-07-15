import assert from 'node:assert/strict'
import { test } from 'node:test'

import interviewData from '../content/interview-questions.json'
import knowledgeData from '../content/knowledge-points.json'
import projectData from '../content/projects.json'
import { filterKnowledge, filterProjects, filterQuestions, normalizeQuery } from '../lib/content/filters'
import { interviewSchema, knowledgeSchema, projectsSchema } from '../lib/content/schemas'

const knowledge = knowledgeSchema.parse(knowledgeData)
const questions = interviewSchema.parse(interviewData)
const projects = projectsSchema.parse(projectData)

test('normalizes whitespace and Chinese queries', () => {
  assert.equal(normalizeQuery('  Agent   Loop  '), 'agent loop')
  assert.equal(normalizeQuery('  结构化 输出 '), '结构化 输出')
})

test('knowledge filters combine query, category and level', () => {
  const result = filterKnowledge(knowledge, { query: '评估', category: 'rag', level: '高级' })
  assert.ok(result.some((item) => item.slug === 'rag-evaluation'))
  assert.ok(result.every((item) => item.category === 'rag' && item.level === '高级'))
})

test('interview filters restore category, level and tag combinations', () => {
  const result = filterQuestions(questions, { category: 'agent', level: '高级', tag: 'Security' })
  assert.deepEqual(result.map((item) => item.id), ['browser-agent-safety', 'agent-guardrails'])
})

test('project filters search stack and summary', () => {
  const byStack = filterProjects(projects, { stack: 'MCP SDK' })
  assert.deepEqual(byStack.map((item) => item.slug), ['mcp-file-assistant'])

  const byQuery = filterProjects(projects, { query: '轨迹' })
  assert.ok(byQuery.some((item) => item.slug === 'agent-evaluation-console'))
})
