import evaluationData from '@/content/labs/agent-runtime-evaluation.json'
import { z } from 'zod'

import { runtimeToolNameSchema } from './contracts'
import { planFixtureTools } from './planners'

const evaluationCaseSchema = z.object({
  id: z.string().min(1),
  goal: z.string().min(8),
  expectedTools: z.array(runtimeToolNameSchema).min(1).max(2)
})

const evaluationCases = z.array(evaluationCaseSchema).length(20).parse(evaluationData)

export function evaluateRuntimePlanner() {
  const cases = evaluationCases.map((item) => {
    const actualTools = planFixtureTools(item.goal).map((call) => call.name)
    const passed = JSON.stringify(actualTools) === JSON.stringify(item.expectedTools)
    return { ...item, actualTools, passed }
  })
  return {
    caseCount: cases.length,
    passedCount: cases.filter((item) => item.passed).length,
    passRate: cases.filter((item) => item.passed).length / cases.length,
    cases
  }
}
