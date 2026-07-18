import { NextResponse } from 'next/server'
import { z } from 'zod'

import { runtimeGoalSchema } from '@/lib/agent-runtime/contracts'
import { resolveRuntimeIdentity, type RuntimeIdentity } from '@/lib/agent-runtime/identity'
import { mapRunToOtelTrace } from '@/lib/agent-runtime/otel'
import { createFixturePlanner, createOpenAiPlanner } from '@/lib/agent-runtime/planners'
import { createRuntimeRateLimiter, getRuntimeClientIdentifier } from '@/lib/agent-runtime/rate-limit'
import { runServerAgent } from '@/lib/agent-runtime/runner'
import { createRuntimeStore } from '@/lib/agent-runtime/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const runIdSchema = z.string().uuid()
const runtimeRequestSchema = z.union([
  runtimeGoalSchema.extend({ runId: runIdSchema.optional() }).strict(),
  z.object({ resumeRunId: runIdSchema }).strict(),
  z.object({ approvalRunId: runIdSchema, decision: z.enum(['approve', 'reject']) }).strict()
])

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store' }
}

function rateLimitHeaders(result: { limit: number; remaining: number; resetAt: number }) {
  return {
    ...noStoreHeaders(),
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000))
  }
}

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}, identity?: RuntimeIdentity) {
  const response = NextResponse.json(body, init)
  if (identity?.setCookie) response.headers.set('Set-Cookie', identity.setCookie)
  return response
}

export async function GET(request: Request) {
  const store = createRuntimeStore({ allowMemory: process.env.NODE_ENV !== 'production' })
  const limiter = createRuntimeRateLimiter()
  const identity = resolveRuntimeIdentity(request)
  const runId = new URL(request.url).searchParams.get('id')
  const format = new URL(request.url).searchParams.get('format')

  if (format !== null && format !== 'otel') {
    return NextResponse.json({ error: 'format 仅支持 otel。' }, { status: 400, headers: noStoreHeaders() })
  }

  if (!runId) {
    return jsonResponse({
      plannerMode: process.env.AGENT_RUNTIME_MODE === 'openai' ? 'openai' : 'fixture',
      openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      rateLimitMode: limiter.mode,
      storageMode: store.mode,
      identityMode: identity.configured ? 'signed-session' : 'disabled',
      writeToolsEnabled: identity.configured && store.mode !== 'disabled'
    }, { headers: noStoreHeaders() }, identity)
  }

  const parsedRunId = runIdSchema.safeParse(runId)
  if (!parsedRunId.success) return NextResponse.json({ error: 'runId 格式无效。' }, { status: 400, headers: noStoreHeaders() })
  if (!identity.configured) {
    return jsonResponse({ error: '生产身份会话尚未配置。' }, { status: 503, headers: noStoreHeaders() }, identity)
  }
  if (store.mode === 'disabled') {
    return NextResponse.json({ error: '生产运行仓储尚未配置。' }, { status: 503, headers: noStoreHeaders() })
  }

  try {
    const rateLimit = await limiter.consume({
      identifier: `replay:${identity.actorId}`,
      limit: 30,
      windowSeconds: 60
    })
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: '回放请求过于频繁。' }, {
        status: 429,
        headers: { ...rateLimitHeaders(rateLimit), 'Retry-After': '60' }
      })
    }
    const record = await store.get(identity.actorId, parsedRunId.data)
    if (!record) return NextResponse.json({ error: '运行记录不存在或已过期。' }, { status: 404, headers: rateLimitHeaders(rateLimit) })
    if (format === 'otel') {
      // 记录保存时刻减去最后一条事件的相对耗时，作为整段运行的近似绝对起点。
      const startedAtUnixMs = Date.parse(record.storedAt) - (record.run.trace.at(-1)?.elapsedMs ?? 0)
      return NextResponse.json(mapRunToOtelTrace(record.run, { startedAtUnixMs }), { headers: rateLimitHeaders(rateLimit) })
    }
    return NextResponse.json(record, { headers: rateLimitHeaders(rateLimit) })
  } catch {
    return NextResponse.json({ error: '运行仓储暂时不可用。' }, { status: 503, headers: noStoreHeaders() })
  }
}

export async function POST(request: Request) {
  const identity = resolveRuntimeIdentity(request)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: '请求体必须是 JSON。' }, { status: 400, headers: noStoreHeaders() }, identity)
  }

  const input = runtimeRequestSchema.safeParse(body)
  if (!input.success) {
    return jsonResponse({ error: input.error.issues[0]?.message ?? '任务目标无效。' }, { status: 400, headers: noStoreHeaders() }, identity)
  }

  const limiter = createRuntimeRateLimiter()
  const store = createRuntimeStore({ allowMemory: process.env.NODE_ENV !== 'production' })
  let resumeFrom = null
  const recoveryRunId = 'resumeRunId' in input.data
    ? input.data.resumeRunId
    : 'approvalRunId' in input.data
      ? input.data.approvalRunId
      : null

  if (recoveryRunId) {
    if (!identity.configured) {
      return jsonResponse({ error: '生产身份会话尚未配置，无法访问运行记录。' }, { status: 503, headers: noStoreHeaders() }, identity)
    }
    if (store.mode === 'disabled') {
      return jsonResponse({ error: '生产运行仓储尚未配置，无法恢复运行。' }, { status: 503, headers: noStoreHeaders() }, identity)
    }
    try {
      resumeFrom = await store.getCheckpoint(identity.actorId, recoveryRunId)
    } catch {
      return NextResponse.json({ error: '运行检查点暂时不可用。' }, { status: 503, headers: noStoreHeaders() })
    }
    if (!resumeFrom) return jsonResponse({ error: '运行检查点不存在或已过期。' }, { status: 404, headers: noStoreHeaders() }, identity)
    const isApproval = 'approvalRunId' in input.data
    const expectedStatus = isApproval ? 'waiting_approval' : 'running'
    if (resumeFrom.status !== expectedStatus) {
      return jsonResponse({ error: `运行当前为 ${resumeFrom.status}，不能执行本次操作。` }, { status: 409, headers: noStoreHeaders() }, identity)
    }
  }

  const liveRequested = resumeFrom ? resumeFrom.mode === 'openai' : process.env.AGENT_RUNTIME_MODE === 'openai'
  const liveEnabled = liveRequested && Boolean(process.env.OPENAI_API_KEY)

  if (liveRequested && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: '真实模型模式缺少服务端模型密钥。' }, { status: 503, headers: noStoreHeaders() })
  }
  if (liveEnabled && !identity.configured) {
    return jsonResponse({ error: '真实模型模式必须先配置签名身份会话。' }, { status: 503, headers: noStoreHeaders() }, identity)
  }
  if (liveEnabled && limiter.mode !== 'redis') {
    return NextResponse.json({ error: '真实模型模式必须先配置持久化 Redis 限流。' }, { status: 503, headers: noStoreHeaders() })
  }

  let rateLimit
  try {
    rateLimit = await limiter.consume({
      identifier: identity.configured ? identity.actorId : getRuntimeClientIdentifier(request),
      limit: liveEnabled ? 4 : 12,
      windowSeconds: 60
    })
  } catch {
    return NextResponse.json({ error: '请求限流守卫暂时不可用。' }, { status: 503, headers: noStoreHeaders() })
  }
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: '请求过于频繁，请在限流窗口重置后重试。' }, {
      status: 429,
      headers: {
        ...rateLimitHeaders(rateLimit),
        'Retry-After': String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)))
      }
    })
  }

  const planner = liveEnabled
    ? createOpenAiPlanner({
      apiKey: process.env.OPENAI_API_KEY!,
      model: resumeFrom?.model ?? process.env.OPENAI_AGENT_MODEL,
      safetyIdentifier: identity.actorId
    })
    : createFixturePlanner()
  const goal = resumeFrom?.goal ?? ('goal' in input.data ? input.data.goal : '')
  const writeEnabled = identity.configured && store.mode !== 'disabled'
  const result = await runServerAgent({
    goal,
    planner,
    runId: 'runId' in input.data ? input.data.runId : undefined,
    resumeFrom: resumeFrom ?? undefined,
    actorId: identity.actorId,
    approvalDecision: 'decision' in input.data ? input.data.decision : undefined,
    permissions: writeEnabled ? ['knowledge:read', 'projects:read', 'notes:write'] : ['knowledge:read', 'projects:read'],
    saveLearningNote: writeEnabled ? (note) => store.saveLearningNote(note) : undefined,
    onCheckpoint: store.mode === 'disabled' ? undefined : (checkpoint) => store.saveCheckpoint(identity.actorId, checkpoint).then(() => undefined)
  })
  const baseResult = { ...result, rateLimit }
  let responseResult = baseResult

  if (store.mode !== 'disabled') {
    const persistedResult = {
      ...baseResult,
      persistence: store.persistence,
      replayUrl: `/api/agent/run?id=${result.runId}`
    }
    try {
      if (await store.save(identity.actorId, persistedResult)) responseResult = persistedResult
    } catch {
      responseResult = { ...baseResult, persistence: 'response-only' }
    }
  }

  return jsonResponse(responseResult, {
    status: result.status === 'failed' ? 502 : result.status === 'waiting_approval' ? 202 : 200,
    headers: rateLimitHeaders(rateLimit)
  }, identity)
}
