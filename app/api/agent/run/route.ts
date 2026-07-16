import { NextResponse } from 'next/server'
import { z } from 'zod'

import { runtimeGoalSchema } from '@/lib/agent-runtime/contracts'
import { createFixturePlanner, createOpenAiPlanner } from '@/lib/agent-runtime/planners'
import { createRuntimeRateLimiter, getRuntimeClientIdentifier } from '@/lib/agent-runtime/rate-limit'
import { runServerAgent } from '@/lib/agent-runtime/runner'
import { createRuntimeStore } from '@/lib/agent-runtime/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const runIdSchema = z.string().uuid()
const runtimeRequestSchema = z.union([
  runtimeGoalSchema.extend({ runId: runIdSchema.optional() }).strict(),
  z.object({ resumeRunId: runIdSchema }).strict()
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

export async function GET(request: Request) {
  const store = createRuntimeStore({ allowMemory: process.env.NODE_ENV !== 'production' })
  const limiter = createRuntimeRateLimiter()
  const runId = new URL(request.url).searchParams.get('id')

  if (!runId) {
    return NextResponse.json({
      plannerMode: process.env.AGENT_RUNTIME_MODE === 'openai' ? 'openai' : 'fixture',
      openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      rateLimitMode: limiter.mode,
      storageMode: store.mode
    }, { headers: noStoreHeaders() })
  }

  const parsedRunId = runIdSchema.safeParse(runId)
  if (!parsedRunId.success) return NextResponse.json({ error: 'runId 格式无效。' }, { status: 400, headers: noStoreHeaders() })
  if (store.mode === 'disabled') {
    return NextResponse.json({ error: '生产运行仓储尚未配置。' }, { status: 503, headers: noStoreHeaders() })
  }

  try {
    const rateLimit = await limiter.consume({
      identifier: `replay:${getRuntimeClientIdentifier(request)}`,
      limit: 30,
      windowSeconds: 60
    })
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: '回放请求过于频繁。' }, {
        status: 429,
        headers: { ...rateLimitHeaders(rateLimit), 'Retry-After': '60' }
      })
    }
    const record = await store.get(parsedRunId.data)
    if (!record) return NextResponse.json({ error: '运行记录不存在或已过期。' }, { status: 404, headers: rateLimitHeaders(rateLimit) })
    return NextResponse.json(record, { headers: rateLimitHeaders(rateLimit) })
  } catch {
    return NextResponse.json({ error: '运行仓储暂时不可用。' }, { status: 503, headers: noStoreHeaders() })
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON。' }, { status: 400, headers: noStoreHeaders() })
  }

  const input = runtimeRequestSchema.safeParse(body)
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message ?? '任务目标无效。' }, { status: 400, headers: noStoreHeaders() })
  }

  const limiter = createRuntimeRateLimiter()
  const store = createRuntimeStore({ allowMemory: process.env.NODE_ENV !== 'production' })
  let resumeFrom = null

  if ('resumeRunId' in input.data) {
    if (store.mode === 'disabled') {
      return NextResponse.json({ error: '生产运行仓储尚未配置，无法恢复运行。' }, { status: 503, headers: noStoreHeaders() })
    }
    try {
      resumeFrom = await store.getCheckpoint(input.data.resumeRunId)
    } catch {
      return NextResponse.json({ error: '运行检查点暂时不可用。' }, { status: 503, headers: noStoreHeaders() })
    }
    if (!resumeFrom) return NextResponse.json({ error: '运行检查点不存在或已过期。' }, { status: 404, headers: noStoreHeaders() })
    if (resumeFrom.status !== 'running') {
      return NextResponse.json({ error: `运行已经处于 ${resumeFrom.status} 终态。` }, { status: 409, headers: noStoreHeaders() })
    }
  }

  const liveRequested = resumeFrom ? resumeFrom.mode === 'openai' : process.env.AGENT_RUNTIME_MODE === 'openai'
  const liveEnabled = liveRequested && Boolean(process.env.OPENAI_API_KEY)

  if (liveRequested && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: '真实模型模式缺少服务端模型密钥。' }, { status: 503, headers: noStoreHeaders() })
  }
  if (liveEnabled && limiter.mode !== 'redis') {
    return NextResponse.json({ error: '真实模型模式必须先配置持久化 Redis 限流。' }, { status: 503, headers: noStoreHeaders() })
  }

  let rateLimit
  try {
    rateLimit = await limiter.consume({
      identifier: getRuntimeClientIdentifier(request),
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
    ? createOpenAiPlanner({ apiKey: process.env.OPENAI_API_KEY!, model: resumeFrom?.model ?? process.env.OPENAI_AGENT_MODEL })
    : createFixturePlanner()
  const goal = resumeFrom?.goal ?? ('goal' in input.data ? input.data.goal : '')
  const result = await runServerAgent({
    goal,
    planner,
    runId: 'runId' in input.data ? input.data.runId : undefined,
    resumeFrom: resumeFrom ?? undefined,
    onCheckpoint: store.mode === 'disabled' ? undefined : (checkpoint) => store.saveCheckpoint(checkpoint).then(() => undefined)
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
      if (await store.save(persistedResult)) responseResult = persistedResult
    } catch {
      responseResult = { ...baseResult, persistence: 'response-only' }
    }
  }

  return NextResponse.json(responseResult, {
    status: result.status === 'failed' ? 502 : 200,
    headers: rateLimitHeaders(rateLimit)
  })
}
