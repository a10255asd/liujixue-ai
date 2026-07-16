import { randomUUID } from 'node:crypto'

import type {
  RuntimeCheckpoint,
  RuntimeApprovalDecision,
  RuntimePendingApproval,
  RuntimePlanner,
  RuntimeRunResult,
  RuntimeTraceEvent,
  RuntimeToolObservation,
  RuntimeUsage
} from './contracts'
import { executeRuntimeTool, getRuntimeToolContract, type SavedLearningNote } from './tools'

const MAX_TOOL_STEPS = 4
const MAX_PLANNER_TURNS = 5

export async function runServerAgent(input: {
  goal: string
  planner: RuntimePlanner
  permissions?: string[]
  maxSteps?: number
  runId?: string
  resumeFrom?: RuntimeCheckpoint
  actorId?: string
  approvalDecision?: RuntimeApprovalDecision
  saveLearningNote?: (input: {
    actorId: string
    idempotencyKey: string
    title: string
    content: string
  }) => Promise<SavedLearningNote>
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

  const checkpoint = async (
    status: RuntimeCheckpoint['status'],
    nextTurnIndex: number,
    summary?: string,
    pendingApproval?: RuntimePendingApproval
  ) => {
    if (!input.onCheckpoint) return
    await input.onCheckpoint({
      version: 2,
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
      pendingApproval,
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
    let firstTurnIndex = input.resumeFrom?.nextTurnIndex ?? 0
    const pendingApproval = input.resumeFrom?.pendingApproval

    if (pendingApproval) {
      if (!input.approvalDecision) {
        return {
          runId, mode: input.planner.mode, model: input.planner.model, status: 'waiting_approval',
          goal: input.goal, summary: '等待用户确认写入学习笔记。', stepsUsed: observations.length, maxSteps,
          observations, trace, usage, requestIds, pendingApproval, persistence: 'response-only'
        }
      }
      if (input.approvalDecision === 'reject') {
        const summary = '用户已拒绝写入，运行安全结束。'
        push({ type: 'approval_resolved', title: '写入审批已拒绝', detail: summary, tool: pendingApproval.call.name, callId: pendingApproval.call.callId })
        await checkpoint('rejected', firstTurnIndex, summary)
        return {
          runId, mode: input.planner.mode, model: input.planner.model, status: 'rejected',
          goal: input.goal, summary, stepsUsed: observations.length, maxSteps, observations, trace, usage,
          requestIds, persistence: 'response-only'
        }
      }

      push({
        type: 'approval_resolved',
        title: '写入审批已通过',
        detail: '仅执行本次已展示的学习笔记写入。',
        tool: pendingApproval.call.name,
        callId: pendingApproval.call.callId
      })
      const approvedObservation = await executeRuntimeTool({
        ...pendingApproval.call,
        permissions,
        actorId: input.actorId,
        idempotencyKey: `${runId}:${pendingApproval.call.callId}`,
        saveLearningNote: input.saveLearningNote
      })
      observations.push(approvedObservation)
      push({
        type: 'tool_result',
        title: approvedObservation.ok ? '学习笔记写入成功' : '学习笔记写入失败',
        detail: approvedObservation.ok ? '写入结果已通过幂等键确认。' : approvedObservation.error ?? '工具失败。',
        tool: pendingApproval.call.name,
        callId: pendingApproval.call.callId
      })
      history.push({
        type: 'function_call_output',
        call_id: pendingApproval.call.callId,
        output: JSON.stringify(approvedObservation.ok ? approvedObservation.output : { error: approvedObservation.error })
      })
      firstTurnIndex += 1
      await checkpoint('running', firstTurnIndex)
    } else {
      await checkpoint('running', firstTurnIndex)
    }

    for (let turnIndex = firstTurnIndex; turnIndex < MAX_PLANNER_TURNS; turnIndex += 1) {
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

        const contract = getRuntimeToolContract(call.name)
        push({
          type: 'tool_guard',
          title: '权限与参数守卫',
          detail: `准备校验 ${contract.risk === 'write' ? '写入' : '只读'}工具 ${call.name}。`,
          tool: call.name,
          callId: call.callId
        })

        if (contract.risk === 'write' && permissions.includes(contract.permission)) {
          const approval: RuntimePendingApproval = {
            call,
            title: '保存学习笔记',
            detail: `将“${String(call.arguments.title ?? '本次学习结果')}”写入当前会话的隔离笔记仓储。`,
            permission: contract.permission,
            risk: 'write'
          }
          push({
            type: 'approval_requested',
            title: '等待写入审批',
            detail: approval.detail,
            tool: call.name,
            callId: call.callId
          })
          await checkpoint('waiting_approval', turnIndex, '等待用户确认写入学习笔记。', approval)
          return {
            runId, mode: input.planner.mode, model: input.planner.model, status: 'waiting_approval',
            goal: input.goal, summary: '等待用户确认写入学习笔记。', stepsUsed: observations.length, maxSteps,
            observations, trace, usage, requestIds, pendingApproval: approval, persistence: 'response-only'
          }
        }

        const observation = await executeRuntimeTool({
          ...call,
          permissions,
          actorId: input.actorId,
          idempotencyKey: `${runId}:${call.callId}`,
          saveLearningNote: input.saveLearningNote
        })
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
