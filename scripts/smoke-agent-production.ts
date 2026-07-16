import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { runAgentProductionSmoke, type AgentSmokeExpectation } from '../lib/agent-runtime/production-smoke'

const expectation: AgentSmokeExpectation = process.env.AGENT_SMOKE_REQUIRE_READY === '1' ? 'runtime-ready' : 'safe-readonly'
const report = await runAgentProductionSmoke({
  baseUrl: process.env.AGENT_SMOKE_TARGET ?? 'https://ai.liujixue.cn',
  expectation
})

if (process.env.AGENT_SMOKE_OUTPUT) {
  const outputPath = resolve(process.env.AGENT_SMOKE_OUTPUT)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`报告：${outputPath}`)
}

console.log(JSON.stringify(report, null, 2))
if (!report.expectationPassed) process.exitCode = 1
