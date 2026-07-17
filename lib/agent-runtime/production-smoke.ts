import { randomUUID } from 'node:crypto'

import type { RuntimeRunResult } from './contracts'

export type AgentSmokeExpectation = 'safe-readonly' | 'runtime-ready' | 'live-model-ready'

export type AgentSmokeCheck = {
  id: string
  passed: boolean
  gate: 'always' | 'release' | 'live'
  detail: string
}

type RuntimeCapability = {
  plannerMode?: string
  openAiConfigured?: boolean
  rateLimitMode?: string
  storageMode?: string
  identityMode?: string
  writeToolsEnabled?: boolean
}

function cookieFrom(response: Response) {
  return response.headers.get('set-cookie')?.split(';')[0] ?? null
}

async function json(response: Response) {
  try {
    return await response.json() as Record<string, unknown>
  } catch {
    return {}
  }
}

function runResult(value: Record<string, unknown>) {
  return value as unknown as RuntimeRunResult
}

export async function runAgentProductionSmoke(options: {
  baseUrl: string
  expectation?: AgentSmokeExpectation
  fetchImpl?: typeof fetch
  createId?: () => string
  now?: () => Date
}) {
  const fetchImpl = options.fetchImpl ?? fetch
  const createId = options.createId ?? randomUUID
  const expectation = options.expectation ?? 'safe-readonly'
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const checks: AgentSmokeCheck[] = []
  const add = (id: string, passed: boolean, gate: AgentSmokeCheck['gate'], detail: string) => {
    checks.push({ id, passed, gate, detail })
  }

  let capability: RuntimeCapability = {}
  let primaryCookie: string | null = null

  try {
    const capabilityResponse = await fetchImpl(`${baseUrl}/api/agent/run`, { cache: 'no-store' })
    capability = await json(capabilityResponse) as RuntimeCapability
    primaryCookie = cookieFrom(capabilityResponse)
    add('capability-http', capabilityResponse.status === 200, 'always', `HTTP ${capabilityResponse.status}`)
    add('planner-declared', capability.plannerMode === 'fixture' || capability.plannerMode === 'openai', 'always', `planner=${capability.plannerMode ?? 'missing'}`)
    add('live-planner', capability.plannerMode === 'openai' && capability.openAiConfigured === true, 'live', `planner=${capability.plannerMode ?? 'missing'}, key=${capability.openAiConfigured === true ? 'configured' : 'missing'}`)
    add('signed-session', capability.identityMode === 'signed-session' && Boolean(primaryCookie), 'release', `identity=${capability.identityMode ?? 'missing'}`)
    add('redis-storage', capability.storageMode === 'redis' && capability.rateLimitMode === 'redis', 'release', `storage=${capability.storageMode ?? 'missing'}, limiter=${capability.rateLimitMode ?? 'missing'}`)
    add('write-tool-enabled', capability.writeToolsEnabled === true, 'release', `writeToolsEnabled=${String(capability.writeToolsEnabled)}`)

    const readRunId = createId()
    const readResponse = await fetchImpl(`${baseUrl}/api/agent/run`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(primaryCookie ? { cookie: primaryCookie } : {})
      },
      body: JSON.stringify({ goal: '检查 task-planning-agent 项目证据', runId: readRunId })
    })
    const readRun = runResult(await json(readResponse))
    add('read-run-http', readResponse.status === 200, 'always', `HTTP ${readResponse.status}`)
    add('read-run-completed', readRun.runId === readRunId && readRun.status === 'completed', 'always', `status=${readRun.status ?? 'missing'}`)
    add(
      'read-tool-boundary',
      readRun.observations?.length === 1 && readRun.observations[0]?.name === 'inspect_project_evidence' && readRun.observations[0]?.ok === true,
      'always',
      `tools=${readRun.observations?.map((item) => item.name).join(',') ?? 'missing'}`
    )

    const runtimeReady = capability.identityMode === 'signed-session' &&
      capability.storageMode === 'redis' &&
      capability.rateLimitMode === 'redis' &&
      capability.writeToolsEnabled === true &&
      Boolean(primaryCookie)

    if (runtimeReady) {
      const replayResponse = await fetchImpl(`${baseUrl}/api/agent/run?id=${readRunId}`, {
        cache: 'no-store',
        headers: { cookie: primaryCookie! }
      })
      const replay = await json(replayResponse) as { run?: RuntimeRunResult }
      add('same-session-replay', replayResponse.status === 200 && replay.run?.runId === readRunId, 'release', `HTTP ${replayResponse.status}`)

      const secondIdentityResponse = await fetchImpl(`${baseUrl}/api/agent/run`, { cache: 'no-store' })
      const secondCookie = cookieFrom(secondIdentityResponse)
      const crossReplayResponse = await fetchImpl(`${baseUrl}/api/agent/run?id=${readRunId}`, {
        cache: 'no-store',
        headers: secondCookie ? { cookie: secondCookie } : {}
      })
      add('cross-session-denied', Boolean(secondCookie) && secondCookie !== primaryCookie && crossReplayResponse.status === 404, 'release', `HTTP ${crossReplayResponse.status}`)

      const writeRunId = createId()
      const writeResponse = await fetchImpl(`${baseUrl}/api/agent/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: primaryCookie! },
        body: JSON.stringify({ goal: '查找 Agent 工具权限知识，并保存成学习笔记', runId: writeRunId })
      })
      const waiting = runResult(await json(writeResponse))
      const writeBeforeApproval = waiting.observations?.filter((item) => item.name === 'save_learning_note') ?? []
      add('write-waits-for-approval', writeResponse.status === 202 && waiting.status === 'waiting_approval' && writeBeforeApproval.length === 0, 'release', `HTTP ${writeResponse.status}, status=${waiting.status ?? 'missing'}`)

      const approveResponse = await fetchImpl(`${baseUrl}/api/agent/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: primaryCookie! },
        body: JSON.stringify({ approvalRunId: writeRunId, decision: 'approve' })
      })
      const approved = runResult(await json(approveResponse))
      const writeObservations = approved.observations?.filter((item) => item.name === 'save_learning_note') ?? []
      const writeOutput = writeObservations[0]?.output as { created?: boolean } | undefined
      add('approved-write-once', approveResponse.status === 200 && approved.status === 'completed' && writeObservations.length === 1 && writeOutput?.created === true, 'release', `HTTP ${approveResponse.status}, writes=${writeObservations.length}`)

      const duplicateApprovalResponse = await fetchImpl(`${baseUrl}/api/agent/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: primaryCookie! },
        body: JSON.stringify({ approvalRunId: writeRunId, decision: 'approve' })
      })
      add('duplicate-approval-blocked', duplicateApprovalResponse.status === 409, 'release', `HTTP ${duplicateApprovalResponse.status}`)
    } else {
      for (const [id, detail] of [
        ['same-session-replay', 'runtime prerequisites disabled'],
        ['cross-session-denied', 'runtime prerequisites disabled'],
        ['write-waits-for-approval', 'runtime prerequisites disabled'],
        ['approved-write-once', 'runtime prerequisites disabled'],
        ['duplicate-approval-blocked', 'runtime prerequisites disabled']
      ] as const) add(id, false, 'release', detail)
    }
  } catch (error) {
    add('smoke-execution', false, 'always', error instanceof Error ? error.message : 'unknown smoke error')
  }

  const alwaysChecks = checks.filter((check) => check.gate === 'always')
  const releaseChecks = checks.filter((check) => check.gate === 'release')
  const liveChecks = checks.filter((check) => check.gate === 'live')
  const safeToServe = alwaysChecks.length > 0 && alwaysChecks.every((check) => check.passed)
  const releaseReady = safeToServe && releaseChecks.length > 0 && releaseChecks.every((check) => check.passed)
  const liveModelReady = releaseReady && liveChecks.length > 0 && liveChecks.every((check) => check.passed)
  const expectationPassed = expectation === 'live-model-ready'
    ? liveModelReady
    : expectation === 'runtime-ready'
      ? releaseReady
      : safeToServe

  return {
    schemaVersion: 1,
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    target: baseUrl,
    expectation,
    capability,
    safeToServe,
    releaseReady,
    liveModelReady,
    expectationPassed,
    checks
  }
}
