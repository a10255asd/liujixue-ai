import { inspectAgentLiveReadiness } from '../lib/agent-runtime/live-readiness'

const report = inspectAgentLiveReadiness()

console.log(JSON.stringify(report, null, 2))
if (!report.baselineReady) process.exitCode = 1
