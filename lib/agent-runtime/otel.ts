import { createHash } from 'node:crypto'

import type { RuntimeRunResult, RuntimeTraceEvent } from './contracts'
import { getRuntimeToolContract, runtimeToolDefinitions } from './tools'

/**
 * 受控 Agent 运行轨迹 → OpenTelemetry GenAI 语义约定对齐的 span JSON。
 *
 * 对齐依据：https://github.com/open-telemetry/semantic-conventions-genai
 * （GenAI semantic conventions，当前为 Development 状态，命名可能继续演进）。
 *
 * 这是“结构对齐的 JSON 导出”，不是完整 OTLP wire format：
 * - 保留 resourceSpans / scopeSpans / spans 与 traceId / spanId / parentSpanId /
 *   startTimeUnixNano / endTimeUnixNano / attributes / events / status 结构；
 * - 属性值使用 OTLP/JSON 编码（int64 以字符串承载）；
 * - 不引入 @opentelemetry/sdk，不保证能被 collector 直接 ingest；
 *   接生产后端时应由真正的 SDK / exporter 重新仪表化。
 *
 * 映射规则：
 * - 一次 run → 根 span `invoke_agent liujixue-controlled-agent`（INTERNAL）。
 * - 每个 planner_response 轮次 → 一个子 span：真实模型模式为 `chat <model>`
 *   （CLIENT，gen_ai.operation.name=chat，gen_ai.provider.name=openai）；
 *   确定性 planner 模式为 `plan`（INTERNAL，gen_ai.operation.name=plan）。
 * - 每次工具调用 → `execute_tool <tool>` 子 span（INTERNAL），挂在请求它的轮次下。
 *   守卫、审批等待、审批结果以 span event 记录；跨检查点恢复的调用仍归并到同一 span。
 * - token usage 只记录在根 span 的 gen_ai.usage.*（运行级聚合值；逐轮用量不在 trace
 *   中持久化，按轮次拆分属于伪造）；确定性模式没有模型调用，省略全部模型/usage 属性。
 *
 * status 约定（本导出以应用身份显式设置 OK；纯探针惯例是只在出错时置 ERROR）：
 * - completed → OK；failed → ERROR + error.type=_OTHER；
 *   budget_exceeded → ERROR + error.type=budget_exceeded；
 * - waiting_approval / rejected → UNSET（运行未结束或按用户决定安全停止，都不是错误）；
 * - 工具执行失败 → execute_tool span ERROR + error.type=_OTHER，错误消息进 status.message；
 *   审批被拒 / 等待中的工具 span → UNSET；预算拦截未执行的调用 → ERROR + budget_exceeded。
 *
 * 自定义事实（runId、权限、幂等键、轮次号等 OTel 未覆盖的字段）统一放在
 * `liujixue.runtime.*` 命名空间，避免污染标准属性。
 *
 * 时间：trace 事件只有相对 elapsedMs。传入 startedAtUnixMs 时把 elapsedMs=0 锚定到该
 * 绝对时间；省略时锚定到 Unix 纪元，只表达相对时序。纳秒换算使用 BigInt，避免
 * 2^53 精度溢出。traceId / spanId 由 runId 经 SHA-256 派生，同一 run 导出结果稳定。
 */

const AGENT_NAME = 'liujixue-controlled-agent'
const SERVICE_NAME = 'liujixue-agent-runtime'
const SCOPE_NAME = '@liujixue/agent-runtime'
const SCOPE_VERSION = '1'

const SPAN_KIND_INTERNAL = 1
const SPAN_KIND_CLIENT = 3

export type OtelAttributeValue =
  | { stringValue: string }
  | { intValue: string }
  | { doubleValue: number }
  | { boolValue: boolean }

export type OtelAttribute = { key: string; value: OtelAttributeValue }

export type OtelSpanEvent = {
  name: string
  timeUnixNano: string
  attributes: OtelAttribute[]
}

export type OtelStatus = {
  code: 'STATUS_CODE_UNSET' | 'STATUS_CODE_OK' | 'STATUS_CODE_ERROR'
  message?: string
}

export type OtelSpan = {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  kind: number
  startTimeUnixNano: string
  endTimeUnixNano: string
  attributes: OtelAttribute[]
  events: OtelSpanEvent[]
  status: OtelStatus
}

export type OtelTraceExport = {
  resourceSpans: Array<{
    resource: { attributes: OtelAttribute[] }
    scopeSpans: Array<{
      scope: { name: string; version: string }
      spans: OtelSpan[]
    }>
  }>
}

type SpanDraft = {
  spanId: string
  parentSpanId?: string
  name: string
  kind: number
  startMs: number
  endMs: number
  attributes: OtelAttribute[]
  events: Array<{ name: string; elapsedMs: number; attributes: OtelAttribute[] }>
  status: OtelStatus
}

function str(key: string, value: string): OtelAttribute {
  return { key, value: { stringValue: value } }
}

function int(key: string, value: number): OtelAttribute {
  return { key, value: { intValue: String(Math.trunc(value)) } }
}

function digest(value: string, length: number) {
  return createHash('sha256').update(value).digest('hex').slice(0, length)
}

/** 同一 runId 的 traceId 恒定；32 位十六进制，与 OTLP trace id 形状一致。 */
export function otelTraceIdForRun(runId: string) {
  return digest(`liujixue:otel:trace:${runId}`, 32)
}

function spanIdFor(runId: string, key: string) {
  return digest(`liujixue:otel:span:${runId}:${key}`, 16)
}

function statusOk(): OtelStatus {
  return { code: 'STATUS_CODE_OK' }
}

function statusUnset(): OtelStatus {
  return { code: 'STATUS_CODE_UNSET' }
}

function statusError(errorType: string, message?: string): OtelStatus {
  return { code: 'STATUS_CODE_ERROR', ...(message ? { message } : {}) }
}

function toolDescription(name: string) {
  return runtimeToolDefinitions.find((tool) => tool.name === name)?.description
}

function rootStatusFor(run: RuntimeRunResult): OtelStatus {
  if (run.status === 'completed') return statusOk()
  if (run.status === 'failed') return statusError('_OTHER', run.summary)
  if (run.status === 'budget_exceeded') return statusError('budget_exceeded', run.summary)
  return statusUnset()
}

/** 把一次受控运行映射为 OTel GenAI 语义约定对齐的 span 树 JSON。纯函数，不做 IO。 */
export function mapRunToOtelTrace(run: RuntimeRunResult, options: { startedAtUnixMs?: number } = {}): OtelTraceExport {
  const anchorMs = Math.trunc(options.startedAtUnixMs ?? 0)
  const traceId = otelTraceIdForRun(run.runId)
  const trace = run.trace
  const firstElapsed = trace[0]?.elapsedMs ?? 0
  const lastElapsed = trace.at(-1)?.elapsedMs ?? firstElapsed
  const isLiveModel = run.mode === 'openai'

  // 每个事件归属的规划轮次：planner_response 开启新一轮；0 表示首个轮次之前的引导事件。
  // 恢复执行时，审批结果与工具结果仍归入当初请求该调用的轮次。
  const eventTurn = new Array<number>(trace.length).fill(0)
  let currentTurn = 0
  trace.forEach((event, index) => {
    if (event.type === 'planner_response') currentTurn += 1
    eventTurn[index] = currentTurn
  })
  const turnCount = currentTurn

  const observationsByCallId = new Map(run.observations.map((observation) => [observation.callId, observation]))

  // 按 callId 归并工具调用事件（可能横跨检查点恢复前后的两段 trace）。
  const callOrder: string[] = []
  const eventsByCallId = new Map<string, Array<{ event: RuntimeTraceEvent; index: number }>>()
  trace.forEach((event, index) => {
    if (!event.callId || !event.tool) return
    if (!eventsByCallId.has(event.callId)) {
      eventsByCallId.set(event.callId, [])
      callOrder.push(event.callId)
    }
    eventsByCallId.get(event.callId)!.push({ event, index })
  })

  const toolSpanByCallId = new Map<string, SpanDraft>()
  const toolSpansByTurn = new Map<number, SpanDraft[]>()
  for (const callId of callOrder) {
    const entries = eventsByCallId.get(callId)!
    const first = entries[0]
    const last = entries.at(-1)!
    const tool = first.event.tool!
    const observation = observationsByCallId.get(callId)
    const executed = entries.some(({ event }) => event.type === 'tool_result')
    const approvalResolved = entries.some(({ event }) => event.type === 'approval_resolved')
    const approvalRequested = entries.some(({ event }) => event.type === 'approval_requested')

    let status: OtelStatus
    let errorType: string | null = null
    if (observation) {
      status = observation.ok ? statusOk() : statusError('_OTHER', observation.error ?? '工具执行失败。')
      if (!observation.ok) errorType = '_OTHER'
    } else if (executed) {
      status = statusError('_OTHER', '工具结果缺失。')
      errorType = '_OTHER'
    } else if (approvalResolved || approvalRequested) {
      // 审批被拒或仍在等待：调用未执行，不是错误。
      status = statusUnset()
    } else {
      // 只有守卫事件：预算拦截，调用未执行。
      status = statusError('budget_exceeded', '工具预算耗尽，调用未执行。')
      errorType = 'budget_exceeded'
    }

    const attributes: OtelAttribute[] = [
      str('gen_ai.operation.name', 'execute_tool'),
      str('gen_ai.tool.name', tool)
    ]
    const description = toolDescription(tool)
    if (description) attributes.push(str('gen_ai.tool.description', description))
    attributes.push(str('gen_ai.tool.type', 'function'), str('gen_ai.tool.call.id', callId))
    if (errorType) attributes.push(str('error.type', errorType))

    const callArguments = observation?.arguments
      ?? (run.pendingApproval?.call.callId === callId ? run.pendingApproval.call.arguments : undefined)
    if (callArguments) attributes.push(str('gen_ai.tool.call.arguments', JSON.stringify(callArguments)))
    if (observation?.ok) attributes.push(str('gen_ai.tool.call.result', JSON.stringify(observation.output)))
    if (observation) attributes.push(int('liujixue.runtime.tool.duration_ms', observation.durationMs))
    attributes.push(
      str('liujixue.runtime.tool.permission', observation?.permission ?? getRuntimeToolContract(tool).permission),
      str('liujixue.runtime.tool.idempotency_key', `${run.runId}:${callId}`)
    )

    const spanEvents: SpanDraft['events'] = []
    for (const { event } of entries) {
      if (event.type === 'tool_guard') {
        spanEvents.push({ name: 'guard_check', elapsedMs: event.elapsedMs, attributes: [str('detail', event.detail)] })
      } else if (event.type === 'approval_requested') {
        spanEvents.push({ name: 'approval_requested', elapsedMs: event.elapsedMs, attributes: [str('detail', event.detail)] })
      } else if (event.type === 'approval_resolved') {
        spanEvents.push({
          name: executed ? 'approval_approved' : 'approval_rejected',
          elapsedMs: event.elapsedMs,
          attributes: [str('detail', event.detail)]
        })
      }
    }

    const draft: SpanDraft = {
      spanId: spanIdFor(run.runId, `tool:${callId}`),
      name: `execute_tool ${tool}`,
      kind: SPAN_KIND_INTERNAL,
      startMs: first.event.elapsedMs,
      endMs: last.event.elapsedMs,
      attributes,
      events: spanEvents,
      status
    }
    toolSpanByCallId.set(callId, draft)
    const turn = eventTurn[first.index]
    const list = toolSpansByTurn.get(turn) ?? []
    list.push(draft)
    toolSpansByTurn.set(turn, list)
  }

  const rootSpanId = spanIdFor(run.runId, 'run')

  const rootAttributes: OtelAttribute[] = [
    str('gen_ai.operation.name', 'invoke_agent'),
    str('gen_ai.agent.name', AGENT_NAME)
  ]
  if (isLiveModel) {
    rootAttributes.push(
      str('gen_ai.provider.name', 'openai'),
      str('gen_ai.request.model', run.model),
      int('gen_ai.usage.input_tokens', run.usage.inputTokens),
      int('gen_ai.usage.output_tokens', run.usage.outputTokens)
    )
    if (run.usage.cachedInputTokens > 0) rootAttributes.push(int('gen_ai.usage.cache_read.input_tokens', run.usage.cachedInputTokens))
    if (run.usage.cacheWriteTokens > 0) rootAttributes.push(int('gen_ai.usage.cache_creation.input_tokens', run.usage.cacheWriteTokens))
  } else {
    rootAttributes.push(str('liujixue.runtime.planner', run.model))
  }
  if (run.status === 'failed') rootAttributes.push(str('error.type', '_OTHER'))
  if (run.status === 'budget_exceeded') rootAttributes.push(str('error.type', 'budget_exceeded'))
  rootAttributes.push(
    str('liujixue.runtime.run.id', run.runId),
    str('liujixue.runtime.run.mode', run.mode),
    str('liujixue.runtime.run.status', run.status),
    int('liujixue.runtime.run.steps_used', run.stepsUsed),
    int('liujixue.runtime.run.max_steps', run.maxSteps),
    str('liujixue.runtime.run.summary', run.summary)
  )

  const rootEvents: SpanDraft['events'] = trace
    .filter((event) => event.type === 'run_resumed')
    .map((event) => ({ name: 'run_resumed', elapsedMs: event.elapsedMs, attributes: [str('detail', event.detail)] }))

  const rootDraft: SpanDraft = {
    spanId: rootSpanId,
    name: `invoke_agent ${AGENT_NAME}`,
    kind: SPAN_KIND_INTERNAL,
    startMs: firstElapsed,
    endMs: lastElapsed,
    attributes: rootAttributes,
    events: rootEvents,
    status: rootStatusFor(run)
  }

  // 深度优先展开：根 → 轮次 → 该轮次的工具子 span。
  const orderedDrafts: SpanDraft[] = [rootDraft]
  for (let turn = 1; turn <= turnCount; turn += 1) {
    const plannerIndex = trace.findIndex((event, index) => event.type === 'planner_response' && eventTurn[index] === turn)
    const segmentIndices = trace.map((_, index) => index).filter((index) => eventTurn[index] === turn)
    const startMs = turn === 1 ? firstElapsed : trace[plannerIndex - 1]?.elapsedMs ?? firstElapsed
    const endMs = trace[segmentIndices.at(-1) ?? plannerIndex]?.elapsedMs ?? startMs

    const attributes: OtelAttribute[] = isLiveModel
      ? [
          str('gen_ai.operation.name', 'chat'),
          str('gen_ai.provider.name', 'openai'),
          str('gen_ai.request.model', run.model),
          int('liujixue.runtime.turn', turn)
        ]
      : [
          str('gen_ai.operation.name', 'plan'),
          str('liujixue.runtime.planner', run.model),
          int('liujixue.runtime.turn', turn)
        ]

    const turnDraft: SpanDraft = {
      spanId: spanIdFor(run.runId, `turn:${turn}`),
      parentSpanId: rootSpanId,
      name: isLiveModel ? `chat ${run.model}` : 'plan',
      kind: isLiveModel ? SPAN_KIND_CLIENT : SPAN_KIND_INTERNAL,
      startMs,
      endMs,
      attributes,
      events: [],
      status: statusUnset()
    }
    orderedDrafts.push(turnDraft)
    for (const toolSpan of toolSpansByTurn.get(turn) ?? []) {
      toolSpan.parentSpanId = turnDraft.spanId
      orderedDrafts.push(toolSpan)
    }
  }
  // 防御：未被任何轮次认领的工具 span（理论上不发生）直接挂到根下。
  for (const callId of callOrder) {
    const toolSpan = toolSpanByCallId.get(callId)!
    if (!orderedDrafts.includes(toolSpan)) {
      toolSpan.parentSpanId = rootSpanId
      orderedDrafts.push(toolSpan)
    }
  }

  const toNano = (elapsedMs: number) => ((BigInt(anchorMs) + BigInt(Math.round(elapsedMs))) * BigInt(1_000_000)).toString()
  const toSpan = (draft: SpanDraft): OtelSpan => ({
    traceId,
    spanId: draft.spanId,
    ...(draft.parentSpanId ? { parentSpanId: draft.parentSpanId } : {}),
    name: draft.name,
    kind: draft.kind,
    startTimeUnixNano: toNano(draft.startMs),
    endTimeUnixNano: toNano(draft.endMs),
    attributes: draft.attributes,
    events: draft.events.map((event) => ({
      name: event.name,
      timeUnixNano: toNano(event.elapsedMs),
      attributes: event.attributes
    })),
    status: draft.status
  })

  return {
    resourceSpans: [
      {
        resource: {
          attributes: [str('service.name', SERVICE_NAME)]
        },
        scopeSpans: [
          {
            scope: { name: SCOPE_NAME, version: SCOPE_VERSION },
            spans: orderedDrafts.map(toSpan)
          }
        ]
      }
    ]
  }
}
