import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { runRuntimeBaseline } from '../lib/agent-runtime/baseline'
import { createOpenAiPlanner } from '../lib/agent-runtime/planners'

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) throw new Error('缺少 OPENAI_API_KEY，拒绝生成伪造的真实模型基线。')

const model = process.env.OPENAI_AGENT_MODEL ?? 'gpt-5.6-luna'
const outputPath = resolve(process.env.AGENT_BASELINE_OUTPUT ?? 'artifacts/agent-runtime/openai-baseline.json')
const report = await runRuntimeBaseline({
  plannerFactory: () => createOpenAiPlanner({ apiKey, model })
})

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.log(`Agent 基线完成：${report.passedCount}/${report.caseCount}，P95 ${report.latency.p95Ms}ms，Token ${report.usage.totalTokens}`)
console.log(`报告：${outputPath}`)

if (!report.releaseCandidate) process.exitCode = 1
