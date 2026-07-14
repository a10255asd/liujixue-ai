import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
}

const roadmap = readJson('../content/roadmap.json')
const knowledge = readJson('../content/knowledge-points.json')
const questions = readJson('../content/interview-questions.json')
const projects = readJson('../content/projects.json')
const resources = readJson('../content/resources.json')
const journals = readJson('../content/journals.json')

function assertUnique(items, key, label) {
  const values = items.map((item) => item[key])
  assert.equal(new Set(values).size, values.length, `${label} 必须唯一`)
}

function assertRefs(refs, targets, label) {
  for (const ref of refs) assert.ok(targets.has(ref), `${label} 引用了不存在的 ${ref}`)
}

test('all content identifiers are unique', () => {
  assertUnique(roadmap, 'slug', '路线 slug')
  assertUnique(knowledge, 'slug', '知识点 slug')
  assertUnique(questions, 'id', '面试题 id')
  assertUnique(projects, 'slug', '项目 slug')
  assertUnique(resources, 'id', '资料 id')
  assertUnique(journals, 'slug', '日志 slug')
})

test('cross-content references resolve to real records', () => {
  const roadmapIds = new Set(roadmap.map((item) => item.slug))
  const questionIds = new Set(questions.map((item) => item.id))
  const projectIds = new Set(projects.map((item) => item.slug))
  const resourceIds = new Set(resources.map((item) => item.id))

  for (const stage of roadmap) {
    assertRefs(stage.prerequisites, roadmapIds, `路线 ${stage.slug}`)
    assertRefs(stage.projectRefs, projectIds, `路线 ${stage.slug}`)
    assertRefs(stage.resourceRefs, resourceIds, `路线 ${stage.slug}`)
  }
  for (const item of knowledge) {
    assertRefs(item.relatedQuestions, questionIds, `知识点 ${item.slug}`)
    assertRefs(item.relatedProjects, projectIds, `知识点 ${item.slug}`)
    assertRefs(item.references, resourceIds, `知识点 ${item.slug}`)
  }
  for (const question of questions) assertRefs(question.references, resourceIds, `面试题 ${question.id}`)
  for (const project of projects) assertRefs(project.relatedQuestions, questionIds, `项目 ${project.slug}`)
  for (const journal of journals) assertRefs([journal.stage], roadmapIds, `日志 ${journal.slug}`)
})
