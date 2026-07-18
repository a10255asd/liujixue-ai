import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { getLabRelatedKnowledge, getLabRelatedQuestions, labContentRelations, type LabSlug } from '../lib/content/lab-relations'

function readJson(path: string) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
}

const knowledge = readJson('../content/knowledge-points.json') as Array<{ slug: string; status: string }>
const questions = readJson('../content/interview-questions.json') as Array<{ id: string; status: string }>

const publishedKnowledge = new Map(knowledge.map((item) => [item.slug, item.status]))
const publishedQuestions = new Map(questions.map((item) => [item.id, item.status]))

const labRoutes = readdirSync(new URL('../app/labs', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

test('every lab route has a declared content relation', () => {
  assert.deepEqual(Object.keys(labContentRelations).sort(), labRoutes)
})

test('every lab references 2-4 real published knowledge points and interview questions', () => {
  for (const [slug, relation] of Object.entries(labContentRelations)) {
    assert.ok(relation.knowledge.length >= 2 && relation.knowledge.length <= 4, `${slug} 知识点数量应为 2-4`)
    assert.ok(relation.questions.length >= 2 && relation.questions.length <= 4, `${slug} 面试题数量应为 2-4`)
    assert.equal(new Set(relation.knowledge).size, relation.knowledge.length, `${slug} 知识点引用必须唯一`)
    assert.equal(new Set(relation.questions).size, relation.questions.length, `${slug} 面试题引用必须唯一`)
    for (const knowledgeSlug of relation.knowledge) {
      assert.equal(publishedKnowledge.get(knowledgeSlug), 'published', `${slug} 引用了不存在或未发布的知识点 ${knowledgeSlug}`)
    }
    for (const questionId of relation.questions) {
      assert.equal(publishedQuestions.get(questionId), 'published', `${slug} 引用了不存在或未发布的面试题 ${questionId}`)
    }
  }
})

test('lab relation resolvers return all referenced published items', () => {
  for (const slug of Object.keys(labContentRelations) as LabSlug[]) {
    assert.equal(getLabRelatedKnowledge(slug).length, labContentRelations[slug].knowledge.length)
    assert.equal(getLabRelatedQuestions(slug).length, labContentRelations[slug].questions.length)
  }
})
