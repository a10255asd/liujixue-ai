import { NextResponse } from 'next/server'

import { runtimeGoalSchema } from '@/lib/agent-runtime/contracts'
import { createFixturePlanner, createOpenAiPlanner } from '@/lib/agent-runtime/planners'
import { runServerAgent } from '@/lib/agent-runtime/runner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON。' }, { status: 400 })
  }

  const input = runtimeGoalSchema.safeParse(body)
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message ?? '任务目标无效。' }, { status: 400 })
  }

  const liveEnabled = process.env.AGENT_RUNTIME_MODE === 'openai' && Boolean(process.env.OPENAI_API_KEY)
  const planner = liveEnabled
    ? createOpenAiPlanner({ apiKey: process.env.OPENAI_API_KEY!, model: process.env.OPENAI_AGENT_MODEL })
    : createFixturePlanner()
  const result = await runServerAgent({ goal: input.data.goal, planner })

  return NextResponse.json(result, {
    status: result.status === 'failed' ? 502 : 200,
    headers: { 'Cache-Control': 'no-store' }
  })
}
