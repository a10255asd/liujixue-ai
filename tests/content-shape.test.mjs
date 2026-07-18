import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
}

test('roadmap stages have executable learning outputs', () => {
  const stages = readJson('../content/roadmap.json')
  assert.equal(stages.length, 8)
  for (const stage of stages) {
    assert.ok(stage.slug)
    assert.ok(stage.title)
    assert.ok(Array.isArray(stage.goals) && stage.goals.length > 0)
    assert.ok(Array.isArray(stage.outputs) && stage.outputs.length > 0)
    assert.ok(Array.isArray(stage.interviewFocus) && stage.interviewFocus.length > 0)
  }
})

test('stage-0 beginner track wires ordered knowledge and self-check refs', () => {
  const stages = readJson('../content/roadmap.json')
  const stage0 = stages.find((stage) => stage.slug === 'stage-0-beginner-foundations')
  assert.ok(stage0, '缺少第 0 阶段 stage-0-beginner-foundations')
  assert.equal(stage0.order, 1)
  assert.deepEqual(stage0.knowledgeRefs, [
    'what-is-an-llm',
    'api-and-api-keys',
    'anatomy-of-an-llm-call',
    'what-is-a-prompt',
    'temperature-and-sampling',
    'first-ai-app-locally',
    'what-is-an-agent',
    'why-rag'
  ])
  assert.ok(Array.isArray(stage0.questionRefs) && stage0.questionRefs.length >= 6)
})

test('every roadmap stage wires non-empty knowledge and question refs', () => {
  const stages = readJson('../content/roadmap.json')
  const knowledge = readJson('../content/knowledge-points.json')
  const questions = readJson('../content/interview-questions.json')
  const knowledgeBySlug = new Map(knowledge.map((item) => [item.slug, item]))
  const questionById = new Map(questions.map((item) => [item.id, item]))

  for (const stage of stages) {
    assert.ok(
      Array.isArray(stage.knowledgeRefs) && stage.knowledgeRefs.length >= 3,
      `${stage.slug} 至少需要 3 个 knowledgeRefs`
    )
    assert.ok(
      Array.isArray(stage.questionRefs) && stage.questionRefs.length >= 4,
      `${stage.slug} 至少需要 4 个 questionRefs`
    )
    for (const ref of stage.knowledgeRefs) {
      const item = knowledgeBySlug.get(ref)
      assert.ok(item, `${stage.slug} 引用了不存在的知识点 ${ref}`)
      assert.equal(item.status, 'published', `${stage.slug} 引用了未发布的知识点 ${ref}`)
    }
    for (const ref of stage.questionRefs) {
      const item = questionById.get(ref)
      assert.ok(item, `${stage.slug} 引用了不存在的面试题 ${ref}`)
      assert.equal(item.status, 'published', `${stage.slug} 引用了未发布的面试题 ${ref}`)
    }
  }
})

test('non-stage-0 knowledge points reach at least 85% roadmap coverage', () => {
  const stages = readJson('../content/roadmap.json')
  const knowledge = readJson('../content/knowledge-points.json')
  const stage0 = stages.find((stage) => stage.slug === 'stage-0-beginner-foundations')
  const stage0Refs = new Set(stage0.knowledgeRefs)
  const pool = knowledge.map((item) => item.slug).filter((slug) => !stage0Refs.has(slug))
  assert.equal(pool.length, 36, '非第 0 阶段知识点池应为 36 个')

  const referenced = new Set(stages.flatMap((stage) => stage.knowledgeRefs ?? []))
  const covered = pool.filter((slug) => referenced.has(slug))
  const ratio = covered.length / pool.length
  assert.ok(
    ratio >= 0.85,
    `非第 0 阶段知识点覆盖率 ${(ratio * 100).toFixed(1)}% 低于 85%，未覆盖：${pool.filter((slug) => !referenced.has(slug)).join(', ')}`
  )
})

test('batch 2 reaches the reviewed content baseline', () => {
  assert.ok(readJson('../content/knowledge-points.json').length >= 30)
  assert.equal(readJson('../content/interview-questions.json').length, 95)
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
    '../content/journals.json',
    '../content/training-tracks.json'
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

test('training tracks define three evidence-driven delivery loops', () => {
  const tracks = readJson('../content/training-tracks.json')
  assert.equal(tracks.length, 3)
  assert.deepEqual(tracks.map((item) => item.order), [1, 2, 3])

  for (const track of tracks) {
    assert.ok(track.tasks.length >= 2)
    assert.ok(track.acceptanceChecklist.length >= 4)
    assert.ok(track.pitchPrompt)
    for (const task of track.tasks) {
      assert.ok(task.deliverable)
      assert.ok(task.evidence.length >= 2)
      assert.ok(task.knowledgeRefs.length > 0)
      assert.ok(task.questionRefs.length > 0)
      assert.ok(task.projectRefs.length > 0)
    }
  }
})

test('career guide has a complete deterministic path', () => {
  const career = readJson('../content/career.json')
  const jdSamples = readJson('../content/career-jd-samples.json')
  assert.equal(career.status, 'published')
  assert.match(career.lastReviewedAt, /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(career.authors.length > 0 && career.reviewers.length > 0)
  assert.equal(career.capabilities.length, 8)
  assert.equal(career.weeks.length, 8)
  assert.equal(career.assessment.length, 12)
  assert.deepEqual(career.weeks.map((item) => item.week), [1, 2, 3, 4, 5, 6, 7, 8])
  assert.equal(jdSamples.length, 6)
  assert.ok(jdSamples.every((item) => item.signals.length >= 4))
  assert.ok(jdSamples.every((item) => item.sourceUrl.startsWith('https://')))
})

test('interview questions include answer training fields', () => {
  const questions = readJson('../content/interview-questions.json')
  assert.equal(questions.length, 95)
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

test('practical projects include resume value and honest delivery evidence', () => {
  const projects = readJson('../content/projects.json')
  assert.ok(projects.length >= 6)
  for (const project of projects) {
    assert.ok(project.slug)
    assert.ok(project.title)
    assert.ok(project.interviewValue)
    assert.ok(project.resumeBullet)
    assert.ok(Array.isArray(project.hardParts) && project.hardParts.length > 0)
    assert.ok(Array.isArray(project.testStrategy) && project.testStrategy.length >= 3)
    assert.ok(Array.isArray(project.deploymentPlan) && project.deploymentPlan.length >= 3)
    assert.ok(Array.isArray(project.acceptanceChecklist) && project.acceptanceChecklist.length >= 3)
    assert.ok(Array.isArray(project.pitchOutline) && project.pitchOutline.length >= 3)
    assert.ok(['blueprint', 'prototype', 'verified'].includes(project.deliveryStatus))
    assert.ok(project.evidence?.summary)

    if (project.deliveryStatus === 'blueprint') {
      assert.equal(project.evidence.commands.length, 0)
      assert.equal(project.evidence.artifacts.length, 0)
    } else {
      assert.match(project.evidence.demoPath, /^\//)
      assert.match(project.evidence.verifiedAt, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(project.evidence.commands.length > 0)
      assert.ok(project.evidence.artifacts.length >= 2)
    }
  }

  assert.equal(projects.filter((project) => project.deliveryStatus === 'prototype').length, 4)
  assert.equal(projects.filter((project) => project.deliveryStatus === 'verified').length, 0)
  assert.equal(projects.find((project) => project.slug === 'prompt-debugger')?.evidence.demoPath, '/labs/prompt-regression')
  assert.equal(projects.find((project) => project.slug === 'rag-knowledge-base')?.evidence.demoPath, '/labs/rag-retrieval')
  assert.equal(projects.find((project) => project.slug === 'task-planning-agent')?.evidence.demoPath, '/labs/controlled-agent')
  assert.equal(projects.find((project) => project.slug === 'agent-evaluation-console')?.evidence.demoPath, '/labs/agent-evaluation')
})
