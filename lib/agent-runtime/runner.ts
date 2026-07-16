import { randomUUID } from 'node:crypto'

import type {
  RuntimeCheckpoint,
  RuntimePlanner,
  RuntimeRunResult,
  RuntimeTraceEvent,
  RuntimeToolObservation,
  RuntimeUsage
} from './contracts'
import { executeRuntimeTool } from './tools'

const MAX_TOOL_STEPS = 4
const MAX_PLANNER_TURNS = 5

export async function runServerAgent(input: {
  goal: string
  planner: RuntimePlanner
  permissions?: string[]
  maxSteps?: number
  runId?: string
  resumeFrom?: RuntimeCheckpoint
  onCheckpoint?: (checkpoint: RuntimeCheckpoint) => Promise<void>
}): Promise<RuntimeRunResult> {
  const startedAt = Date.now()
  const runId = input.resumeFrom?.runId ?? input.runId ?? randomUUID()
  const maxSteps = Math.min(Math.max(input.resumeFrom?.maxSteps ?? input.maxSteps ?? MAX_TOOL_STEPS, 1), MAX_TOOL_STEPS)
  const permissions = input.permissions ?? ['knowledge:read', 'projects:read']
  const trace: RuntimeTraceEvent[] = input.resumeFrom ? [...input.resumeFrom.trace] : []
  const observations: RuntimeToolObservation[] = input.resumeFrom ? [...input.resumeFrom.observations] : []
  const history: unknown[] = input.resumeFrom ? [...input.resumeFrom.history] : [{ role: 'user', content: input.goal }]
  const usage: RuntimeUsage = input.resumeFrom ? { ...input.resumeFrom.usage } : { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  const requestIds = input.resumeFrom ? [...input.resumeFrom.requestIds] : []
  const elapsedOffset = trace.at(-1)?.elapsedMs ?? 0

  const push = (event: Omit<RuntimeTraceEvent, 'sequence' | 'elapsedMs'>) => {
    trace.push({ ...event, sequence: trace.length + 1, elapsedMs: elapsedOffset + Date.now() - startedAt })
  }

  const checkpoint = async (status: RuntimeCheckpoint['status'], nextTurnIndex: number, summary?: string) => {
    if (!input.onCheckpoint) return
    await input.onCheckpoint({
      version: 1,
      runId,
      goal: input.goal,
      mode: input.planner.mode,
      model: input.planner.model,
      status,
      nextTurnIndex,
      maxSteps,
      history: [...history],
      observations: [...observations],
      trace: [...trace],
      usage: { ...usage },
      requestIds: [...requestIds],
      summary,
      updatedAt: new Date().toISOString()
    })
  }

  if (input.resumeFrom) {
    push({ type: 'run_resumed', title: '从检查点恢复', detail: `从第 ${input.resumeFrom.nextTurnIndex + 1} 个规划轮次继续。` })
  } else {
    push({ type: 'run_started', title: '服务端运行已创建', detail: `规划器 ${input.planner.model}，最多 ${maxSteps} 个工具步。` })
  }
  try {
    await checkpoint('running', input.resumeFrom?.nextTurnIndex ?? 0)
    for (let turnIndex = input.resumeFrom?.nextTurnIndex ?? 0; turnIndex < MAX_PLANNER_TURNS; turnIndex += 1) {
      const turn = await input.planner.next({ goal: input.goal, history, observations })
      usage.inputTokens += turn.usage.inputTokens
      usage.outputTokens += turn.usage.outputTokens
      usage.totalTokens += turn.usage.totalTokens
      if (turn.requestId && !requestIds.includes(turn.requestId)) requestIds.push(turn.requestId)
      push({
        type: 'planner_response',
        title: turn.calls.length ? '规划器请求工具' : '规划器结束运行',
        detail: turn.calls.length ? `本轮请求 ${turn.calls.length} 个工具。` : '未请求更多工具。'
      })

      if (!turn.calls.length) {
        const summary = turn.finalText?.trim() || '规划器没有返回可用总结。'
        push({ type: 'run_completed', title: '运行完成', detail: summary })
        await checkpoint('completed', turnIndex + 1, summary)
        return {
          runId, mode: input.planner.mode, model: input.planner.model, status: 'completed',
          goal: input.goal, summary, stepsUsed: observations.length, maxSteps, observations, trace, usage,
          requestIds, persistence: 'response-only'
        }
      }

      if (turn.calls.length > 1) throw new Error('规划器单轮请求超过一个工具，运行已停止。')

      history.push(...turn.rawOutput)
      for (const call of turn.calls) {
        if (observations.length >= maxSteps) {
          push({ type: 'tool_guard', title: '工具预算耗尽', detail: `已使用 ${observations.length}/${maxSteps} 个工具步。`, tool: call.name, callId: call.callId })
          await checkpoint('budget_exceeded', turnIndex, '工具预算耗尽，运行已停止。')
          return {
            runId, mode: input.planner.mode, model: input.planner.model, status: 'budget_exceeded',
            goal: input.goal, summary: '工具预算耗尽，运行已停止。', stepsUsed: observations.length, maxSteps,
            observations, trace, usage, requestIds, persistence: 'response-only'
          }
        }

        push({ type: 'tool_guard', title: '权限与参数守卫', detail: `准备执行只读工具 ${call.name}。`, tool: call.name, callId: call.callId })
        const observation = await executeRuntimeTool({ ...call, permissions })
        observations.push(observation)
        push({
          type: 'tool_result',
          title: observation.ok ? '工具执行成功' : '工具执行失败',
          detail: observation.ok ? `${call.name} 返回结构化证据。` : observation.error ?? '工具失败。',
          tool: call.name,
          callId: call.callId
        })
        history.push({
          type: 'function_call_output',
          call_id: call.callId,
          output: JSON.stringify(observation.ok ? observation.output : { error: observation.error })
        })
        await checkpoint('running', turnIndex + 1)
      }
    }
    throw new Error('规划轮次达到上限')
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知运行错误'
    push({ type: 'run_failed', title: '运行失败', detail: message })
    try {
      await checkpoint('failed', input.resumeFrom?.nextTurnIndex ?? 0, message)
    } catch {
      // The original failure is more useful than a repeated checkpoint error.
    }
    return {
      runId, mode: input.planner.mode, model: input.planner.model, status: 'failed',
      goal: input.goal, summary: message, stepsUsed: observations.length, maxSteps, observations, trace, usage,
      requestIds, persistence: 'response-only'
    }
  }
}
