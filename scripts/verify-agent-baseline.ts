import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { verifyRuntimeBaselineReport } from '../lib/agent-runtime/baseline-verification'

async function main() {
  const inputPath = resolve(process.env.AGENT_BASELINE_INPUT ?? 'artifacts/agent-runtime/openai-baseline.json')
  const report = JSON.parse(await readFile(inputPath, 'utf8')) as unknown
  const verification = verifyRuntimeBaselineReport(report)

  console.log(JSON.stringify({ inputPath, ...verification }, null, 2))
  if (!verification.valid) process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    schemaVersion: 1,
    valid: false,
    error: error instanceof Error ? error.message : '无法读取基线报告'
  }, null, 2))
  process.exitCode = 1
})
