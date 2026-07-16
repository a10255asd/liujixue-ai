import assert from 'node:assert/strict'
import test from 'node:test'

import { getCareerCalibrationWorkspace } from '../lib/labs/career-calibration'
import { interviewRubric, scoreMockInterview } from '../lib/labs/mock-interview-scoring'

test('岗位校准工作台使用六个真实来源和现有四个原型', () => {
  const workspace = getCareerCalibrationWorkspace()

  assert.equal(workspace.sourceCount, 6)
  assert.equal(workspace.capabilityCount, 8)
  assert.equal(workspace.prototypeCount, 4)
  assert.equal(workspace.verifiedCount, 0)
  assert.ok(workspace.reports.every((report) => report.sample.sourceUrl.startsWith('https://')))
  assert.ok(workspace.reports.every((report) => report.sample.accessedAt === '2026-07-16'))
})

test('每个岗位报告都能生成五道有证据回链的固定面试题', () => {
  const workspace = getCareerCalibrationWorkspace()

  for (const report of workspace.reports) {
    assert.equal(report.interview.length, 5)
    assert.equal(new Set(report.interview.map((item) => item.id)).size, 5)
    assert.ok(report.interview.every((item) => item.questionHref.startsWith('/interview/')))
    assert.ok(report.interview.every((item) => item.rubric.length === 4))
    assert.ok(report.interview.every((item) => item.evidencePrompt.includes('必须')))
  }
})

test('作品集覆盖分只反映项目成熟度而不是录用概率', () => {
  const workspace = getCareerCalibrationWorkspace()

  assert.ok(workspace.reports.every((report) => report.coverageScore > 0 && report.coverageScore < 100))
  assert.ok(workspace.evidence.every((item) => item.level !== 'strong'))
  assert.equal(workspace.evidence.find((item) => item.capabilityId === 'mcp-tools')?.level, 'gap')
  assert.equal(workspace.evidence.find((item) => item.capabilityId === 'eval-observability')?.level, 'partial')
})

test('模拟面试评分忽略重复项和未知评分项', () => {
  const questions = getCareerCalibrationWorkspace().reports[0].interview
  const selected = {
    [questions[0].id]: ['concept', 'concept', 'unknown'],
    [questions[1].id]: ['concept', 'design']
  }
  const score = scoreMockInterview(questions, selected)

  assert.equal(score.points, 3)
  assert.equal(score.maximumPoints, 20)
  assert.equal(score.answeredQuestions, 2)
})

test('全部评分锚点完成时得到可重复的满分结果', () => {
  const questions = getCareerCalibrationWorkspace().reports[0].interview
  const selected = Object.fromEntries(questions.map((question) => [
    question.id,
    interviewRubric.map((item) => item.id)
  ]))
  const score = scoreMockInterview(questions, selected)

  assert.equal(score.points, 20)
  assert.equal(score.percentage, 100)
  assert.equal(score.answeredQuestions, 5)
  assert.match(score.feedback, /证据链已经完整/)
})
