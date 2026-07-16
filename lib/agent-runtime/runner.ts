import { randomUUID } from 'node:crypto'

import type {
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
}): Promise<RuntimeRunResult> {
  const startedAt = Date.now()
  const maxSteps = Math.min(Math.max(input.maxSteps ?? MAX_TOOL_STEPS, 1), MAX_TOOL_STEPS)
  const permissions = input.permissions ?? ['knowledge:read', 'projects:read']
  const trace: RuntimeTraceEvent[] = []
  const observations: RuntimeToolObservation[] = []
  const history: unknown[] = [{ role: 'user', content: input.goal }]
  const usage: RuntimeUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

  const push = (event: Omit<RuntimeTraceEvent, 'sequence' | 'elapsedMs'>) => {
    trace.push({ ...event, sequence: trace.length + 1, elapsedMs: Date.now() - startedAt })
  }
  push({ type: 'run_started', title: '服务端运行已创建', detail: `规划器 ${input.planner.model}，最多 ${maxSteps} 个工具步。` })

  try {
    for (let turnIndex = 0; turnIndex < MAX_PLANNER_TURNS; turnIndex += 1) {
      const turn = await input.planner.next({ goal: input.goal, history, observations })
      usage.inputTokens += turn.usage.inputTokens
      usage.outputTokens += turn.usage.outputTokens
      usage.totalTokens += turn.usage.totalTokens
      push({
        type: 'planner_response',
        title: turn.calls.length ? '规划器请求工具' : '规划器结束运行',
        detail: turn.calls.length ? `本轮请求 ${turn.calls.length} 个工具。` : '未请求更多工具。'
      })

      if (!turn.calls.length) {
        const summary = turn.finalText?.trim() || '规划器没有返回可用总结。'
        push({ type: 'run_completed', title: '运行完成', detail: summary })
        return {
          runId: randomUUID(), mode: input.planner.mode, model: input.planner.model, status: 'completed',
          goal: input.goal, summary, stepsUsed: observations.length, maxSteps, observations, trace, usage,
          persistence: 'response-only'
        }
      }

      history.push(...turn.rawOutput)
      for (const call of turn.calls) {
        if (observations.length >= maxSteps) {
          push({ type: 'tool_guard', title: '工具预算耗尽', detail: `已使用 ${observations.length}/${maxSteps} 个工具步。`, tool: call.name, callId: call.callId })
          return {
            runId: randomUUID(), mode: input.planner.mode, model: input.planner.model, status: 'budget_exceeded',
            goal: input.goal, summary: '工具预算耗尽，运行已停止。', stepsUsed: observations.length, maxSteps,
            observations, trace, usage, persistence: 'response-only'
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
      }
    }
    throw new Error('规划轮次达到上限')
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知运行错误'
    push({ type: 'run_failed', title: '运行失败', detail: message })
    return {
      runId: randomUUID(), mode: input.planner.mode, model: input.planner.model, status: 'failed',
      goal: input.goal, summary: message, stepsUsed: observations.length, maxSteps, observations, trace, usage,
      persistence: 'response-only'
    }
  }
}
