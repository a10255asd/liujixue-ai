export const interviewRubric = [
  { id: 'concept', label: '概念准确', description: '先给出边界清晰的核心结论。' },
  { id: 'design', label: '工程取舍', description: '解释架构位置、约束与替代方案。' },
  { id: 'evidence', label: '项目证据', description: '引用真实项目、代码或运行结果。' },
  { id: 'validation', label: '失败与验证', description: '说明失败路径、测试和衡量指标。' }
] as const

export type InterviewRubricId = typeof interviewRubric[number]['id']

export type MockInterviewQuestionScore = {
  questionId: string
  capabilityId: string
  points: number
}

export type MockInterviewScore = {
  points: number
  maximumPoints: number
  percentage: number
  answeredQuestions: number
  weakestCapabilityId?: string
  feedback: string
}

export function scoreMockInterview(
  questions: Array<{ id: string; capabilityId: string }>,
  selected: Record<string, string[]>
): MockInterviewScore {
  const allowedIds = new Set<string>(interviewRubric.map((item) => item.id))
  const scores: MockInterviewQuestionScore[] = questions.map((question) => ({
    questionId: question.id,
    capabilityId: question.capabilityId,
    points: new Set((selected[question.id] ?? []).filter((item) => allowedIds.has(item))).size
  }))
  const points = scores.reduce((sum, item) => sum + item.points, 0)
  const maximumPoints = questions.length * interviewRubric.length
  const percentage = maximumPoints ? Math.round((points / maximumPoints) * 100) : 0
  const answeredQuestions = scores.filter((item) => item.points > 0).length
  const weakest = [...scores].sort((a, b) => a.points - b.points)[0]

  const feedback = percentage >= 85
    ? '证据链已经完整，下一轮重点压缩表达并接受连续追问。'
    : percentage >= 65
      ? '核心回答可用，下一轮优先补项目数据、失败路径和验证结果。'
      : percentage >= 40
        ? '当前回答偏概念化，先把架构取舍和一个可运行项目证据讲完整。'
        : '先按评分锚点准备回答，不要急着背更多题目。'

  return {
    points,
    maximumPoints,
    percentage,
    answeredQuestions,
    weakestCapabilityId: weakest?.capabilityId,
    feedback
  }
}
