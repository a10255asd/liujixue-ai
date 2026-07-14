import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
}

test('roadmap stages have executable learning outputs', () => {
  const stages = readJson('../content/roadmap.json')
  assert.ok(stages.length >= 4)
  for (const stage of stages) {
    assert.ok(stage.slug)
    assert.ok(stage.title)
    assert.ok(Array.isArray(stage.goals) && stage.goals.length > 0)
    assert.ok(Array.isArray(stage.outputs) && stage.outputs.length > 0)
    assert.ok(Array.isArray(stage.interviewFocus) && stage.interviewFocus.length > 0)
  }
})

test('interview questions include answer training fields', () => {
  const questions = readJson('../content/interview-questions.json')
  assert.ok(questions.length >= 3)
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
  assert.ok(projects.length >= 3)
  for (const project of projects) {
    assert.ok(project.slug)
    assert.ok(project.title)
    assert.ok(project.interviewValue)
    assert.ok(project.resumeBullet)
    assert.ok(Array.isArray(project.hardParts) && project.hardParts.length > 0)
  }
})

