import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
}

test('roadmap stages have executable learning outputs', () => {
  const stages = readJson('../content/roadmap.json')
  assert.equal(stages.length, 7)
  for (const stage of stages) {
    assert.ok(stage.slug)
    assert.ok(stage.title)
    assert.ok(Array.isArray(stage.goals) && stage.goals.length > 0)
    assert.ok(Array.isArray(stage.outputs) && stage.outputs.length > 0)
    assert.ok(Array.isArray(stage.interviewFocus) && stage.interviewFocus.length > 0)
  }
})

test('batch 2 reaches the reviewed content baseline', () => {
  assert.ok(readJson('../content/knowledge-points.json').length >= 30)
  assert.equal(readJson('../content/interview-questions.json').length, 80)
  assert.ok(readJson('../content/projects.json').length >= 6)
  assert.ok(readJson('../content/resources.json').length >= 12)
})

test('all published records carry audit fields', () => {
  const files = [
    '../content/roadmap.json',
    '../content/knowledge-points.json',
    '../content/interview-questions.json',
    '../content/projects.json',
    '../content/resources.json',
    '../content/journals.json'
  ]

  for (const file of files) {
    for (const item of readJson(file)) {
      assert.equal(item.status, 'published', `${file} ${item.slug ?? item.id} 未发布`)
      assert.match(item.lastReviewedAt, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(Array.isArray(item.authors) && item.authors.length > 0)
      assert.ok(Array.isArray(item.reviewers) && item.reviewers.length > 0)
    }
  }
})

test('interview questions include answer training fields', () => {
  const questions = readJson('../content/interview-questions.json')
  assert.equal(questions.length, 80)
  for (const item of questions) {
    assert.ok(item.id)
    assert.ok(item.question)
    assert.ok(Array.isArray(item.whatItTests) && item.whatItTests.length > 0)
    assert.ok(item.shortAnswer)
    assert.ok(item.fullAnswer)
    assert.ok(Array.isArray(item.followUps) && item.followUps.length > 0)
    assert.ok(item.projectConnection)
  }
})

test('practical projects include resume value', () => {
  const projects = readJson('../content/projects.json')
  assert.ok(projects.length >= 6)
  for (const project of projects) {
    assert.ok(project.slug)
    assert.ok(project.title)
    assert.ok(project.interviewValue)
    assert.ok(project.resumeBullet)
    assert.ok(Array.isArray(project.hardParts) && project.hardParts.length > 0)
  }
})
