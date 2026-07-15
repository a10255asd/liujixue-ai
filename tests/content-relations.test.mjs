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
const career = readJson('../content/career.json')
const trainingTracks = readJson('../content/training-tracks.json')

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
  assertUnique(career.capabilities, 'id', '求职能力 id')
  assertUnique(career.weeks, 'week', '求职周次')
  assertUnique(career.assessment, 'id', '自测 id')
  assertUnique(trainingTracks, 'slug', '训练路径 slug')
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

  const capabilityIds = new Set(career.capabilities.map((item) => item.id))
  for (const capability of career.capabilities) {
    assertRefs(capability.knowledgeRefs, new Set(knowledge.map((item) => item.slug)), `求职能力 ${capability.id}`)
    assertRefs(capability.questionRefs, questionIds, `求职能力 ${capability.id}`)
    assertRefs(capability.projectRefs, projectIds, `求职能力 ${capability.id}`)
  }
  for (const week of career.weeks) {
    assertRefs(week.knowledgeRefs, new Set(knowledge.map((item) => item.slug)), `第 ${week.week} 周`)
    assertRefs(week.questionRefs, questionIds, `第 ${week.week} 周`)
    assertRefs([week.projectRef], projectIds, `第 ${week.week} 周`)
  }
  for (const item of career.assessment) assertRefs([item.capabilityId], capabilityIds, `自测 ${item.id}`)
  for (const track of trainingTracks) {
    assertUnique(track.tasks, 'id', `训练路径 ${track.slug} 任务 id`)
    for (const task of track.tasks) {
      assertRefs(task.knowledgeRefs, new Set(knowledge.map((item) => item.slug)), `训练任务 ${track.slug}/${task.id}`)
      assertRefs(task.questionRefs, questionIds, `训练任务 ${track.slug}/${task.id}`)
      assertRefs(task.projectRefs, projectIds, `训练任务 ${track.slug}/${task.id}`)
    }
  }
})
