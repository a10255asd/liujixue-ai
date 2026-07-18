import assert from 'node:assert/strict'
import test from 'node:test'

import type { RuntimeCheckpoint, RuntimePlanner } from '../lib/agent-runtime/contracts'
import { mapRunToOtelTrace, otelTraceIdForRun, type OtelSpan } from '../lib/agent-runtime/otel'
import { createFixturePlanner } from '../lib/agent-runtime/planners'
import { runServerAgent } from '../lib/agent-runtime/runner'

const READ_GOAL = '先查找 Agent 工具权限知识，再检查 task-planning-agent 项目证据'
const WRITE_GOAL = '查找 Agent 工具权限知识，并保存成学习笔记'
const WRITE_PERMISSIONS = ['knowledge:read', 'projects:read', 'notes:write']

function spansOf(run: Parameters<typeof mapRunToOtelTrace>[0], startedAtUnixMs?: number) {
  const exported = mapRunToOtelTrace(run, startedAtUnixMs === undefined ? {} : { startedAtUnixMs })
  return exported.resourceSpans[0].scopeSpans[0].spans
}

function attr(span: OtelSpan, key: string) {
  return span.attributes.find((attribute) => attribute.key === key)?.value
}

function strAttr(span: OtelSpan, key: string) {
  const value = attr(span, key)
  return value && 'stringValue' in value ? value.stringValue : undefined
}

function intAttr(span: OtelSpan, key: string) {
  const value = attr(span, key)
  return value && 'intValue' in value ? Number(value.intValue) : undefined
}

function createScriptedOpenAiPlanner(): RuntimePlanner {
  let turn = 0
  return {
    mode: 'openai',
    model: 'test-model-x',
    async next() {
      turn += 1
      if (turn === 1) {
        return {
          calls: [{ callId: 'call-live-1', name: 'search_knowledge', arguments: { query: 'Agent 工具权限', limit: 2 } }],
          rawOutput: [],
          requestId: 'req_live_1',
          usage: { inputTokens: 120, cachedInputTokens: 30, cacheWriteTokens: 10, outputTokens: 45, reasoningTokens: 5, totalTokens: 165 }
        }
      }
      return {
        calls: [],
        finalText: '已完成证据总结。',
        rawOutput: [],
        requestId: 'req_live_2',
        usage: { inputTokens: 80, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 20, reasoningTokens: 0, totalTokens: 100 }
      }
    }
  }
}

async function runUntilWaitingApproval() {
  let waitingCheckpoint: RuntimeCheckpoint | null = null
  const waiting = await runServerAgent({
    goal: WRITE_GOAL,
    planner: createFixturePlanner(),
    permissions: WRITE_PERMISSIONS,
    onCheckpoint: async (checkpoint) => {
      if (checkpoint.status === 'waiting_approval') waitingCheckpoint = checkpoint
    }
  })
  assert.equal(waiting.status, 'waiting_approval')
  assert.ok(waitingCheckpoint)
  return { waiting, checkpoint: waitingCheckpoint as unknown as RuntimeCheckpoint }
}

test('fixture run maps to invoke_agent root with plan turns and execute_tool children', async () => {
  const run = await runServerAgent({ goal: READ_GOAL, planner: createFixturePlanner() })
  const spans = spansOf(run)

  assert.deepEqual(spans.map((span) => span.name), [
    'invoke_agent liujixue-controlled-agent',
    'plan',
    'execute_tool search_knowledge',
    'plan',
    'execute_tool inspect_project_evidence',
    'plan'
  ])
  assert.ok(spans.every((span) => span.kind === 1))

  const [root, firstTurn, searchTool, secondTurn, projectTool] = spans
  assert.equal(root.parentSpanId, undefined)
  assert.equal(firstTurn.parentSpanId, root.spanId)
  assert.equal(searchTool.parentSpanId, firstTurn.spanId)
  assert.equal(secondTurn.parentSpanId, root.spanId)
  assert.equal(projectTool.parentSpanId, secondTurn.spanId)

  assert.equal(strAttr(root, 'gen_ai.operation.name'), 'invoke_agent')
  assert.equal(strAttr(root, 'gen_ai.agent.name'), 'liujixue-controlled-agent')
  assert.equal(strAttr(firstTurn, 'gen_ai.operation.name'), 'plan')
  assert.equal(strAttr(firstTurn, 'liujixue.runtime.planner'), 'deterministic-server-planner-v1')
  assert.equal(intAttr(firstTurn, 'liujixue.runtime.turn'), 1)

  assert.equal(strAttr(searchTool, 'gen_ai.operation.name'), 'execute_tool')
  assert.equal(strAttr(searchTool, 'gen_ai.tool.name'), 'search_knowledge')
  assert.equal(strAttr(searchTool, 'gen_ai.tool.call.id'), 'fixture-search-1')
  assert.equal(strAttr(searchTool, 'gen_ai.tool.type'), 'function')
  assert.equal(strAttr(searchTool, 'liujixue.runtime.tool.permission'), 'knowledge:read')
  assert.equal(strAttr(searchTool, 'liujixue.runtime.tool.idempotency_key'), `${run.runId}:fixture-search-1`)
  assert.deepEqual(JSON.parse(strAttr(searchTool, 'gen_ai.tool.call.arguments')!), { query: READ_GOAL, limit: 3 })
  assert.ok(strAttr(searchTool, 'gen_ai.tool.call.result')!.includes('"count"'))
  assert.equal(searchTool.status.code, 'STATUS_CODE_OK')
  assert.equal(root.status.code, 'STATUS_CODE_OK')
})

test('trace and span ids are deterministic, hex-shaped, and shared by the whole tree', async () => {
  const run = await runServerAgent({ goal: READ_GOAL, planner: createFixturePlanner() })
  const first = mapRunToOtelTrace(run, { startedAtUnixMs: 1_700_000_000_000 })
  const second = mapRunToOtelTrace(run, { startedAtUnixMs: 1_700_000_000_000 })
  assert.deepEqual(first, second)

  const spans = first.resourceSpans[0].scopeSpans[0].spans
  const traceId = otelTraceIdForRun(run.runId)
  assert.match(traceId, /^[0-9a-f]{32}$/)
  assert.ok(spans.every((span) => span.traceId === traceId))
  assert.ok(spans.every((span) => /^[0-9a-f]{16}$/.test(span.spanId)))
  assert.equal(new Set(spans.map((span) => span.spanId)).size, spans.length)

  const otherRun = await runServerAgent({ goal: READ_GOAL, planner: createFixturePlanner() })
  assert.notEqual(otelTraceIdForRun(otherRun.runId), traceId)
})

test('elapsed milliseconds convert to anchored unix nano strings with BigInt precision', async () => {
  const run = await runServerAgent({ goal: READ_GOAL, planner: createFixturePlanner() })
  const anchor = 1_700_000_000_000
  const spans = spansOf(run, anchor)
  const firstElapsed = BigInt(run.trace[0]?.elapsedMs ?? 0)
  const lastElapsed = BigInt(run.trace.at(-1)?.elapsedMs ?? 0)

  assert.equal(spans[0].startTimeUnixNano, ((BigInt(anchor) + firstElapsed) * BigInt(1_000_000)).toString())
  assert.equal(spans[0].endTimeUnixNano, ((BigInt(anchor) + lastElapsed) * BigInt(1_000_000)).toString())

  const byName = new Map(spans.map((span) => [span.name, span]))
  for (const span of spans) {
    assert.ok(BigInt(span.startTimeUnixNano) <= BigInt(span.endTimeUnixNano))
    assert.ok(BigInt(span.startTimeUnixNano) >= BigInt(spans[0].startTimeUnixNano))
    assert.ok(BigInt(span.endTimeUnixNano) <= BigInt(spans[0].endTimeUnixNano))
  }
  const searchTool = byName.get('execute_tool search_knowledge')!
  const firstTurn = spans[1]
  assert.ok(BigInt(searchTool.startTimeUnixNano) >= BigInt(firstTurn.startTimeUnixNano))
  assert.ok(BigInt(searchTool.endTimeUnixNano) <= BigInt(firstTurn.endTimeUnixNano))
})

test('openai mode names chat spans and puts aggregate usage on the root span', async () => {
  const run = await runServerAgent({ goal: READ_GOAL, planner: createScriptedOpenAiPlanner() })
  assert.equal(run.status, 'completed')
  const spans = spansOf(run)

  assert.deepEqual(spans.map((span) => span.name), [
    'invoke_agent liujixue-controlled-agent',
    'chat test-model-x',
    'execute_tool search_knowledge',
    'chat test-model-x'
  ])
  const [root, firstTurn] = spans
  assert.equal(firstTurn.kind, 3)
  assert.equal(strAttr(firstTurn, 'gen_ai.operation.name'), 'chat')
  assert.equal(strAttr(firstTurn, 'gen_ai.provider.name'), 'openai')
  assert.equal(strAttr(firstTurn, 'gen_ai.request.model'), 'test-model-x')

  assert.equal(strAttr(root, 'gen_ai.provider.name'), 'openai')
  assert.equal(strAttr(root, 'gen_ai.request.model'), 'test-model-x')
  assert.equal(intAttr(root, 'gen_ai.usage.input_tokens'), 200)
  assert.equal(intAttr(root, 'gen_ai.usage.output_tokens'), 65)
  assert.equal(intAttr(root, 'gen_ai.usage.cache_read.input_tokens'), 30)
  assert.equal(intAttr(root, 'gen_ai.usage.cache_creation.input_tokens'), 10)
  // 逐轮拆分用量属于伪造：模型轮次 span 不携带 usage 属性。
  assert.equal(attr(firstTurn, 'gen_ai.usage.input_tokens'), undefined)
})

test('fixture mode omits model, provider, and usage attributes instead of fabricating them', async () => {
  const run = await runServerAgent({ goal: READ_GOAL, planner: createFixturePlanner() })
  const spans = spansOf(run)
  for (const span of spans) {
    assert.equal(attr(span, 'gen_ai.provider.name'), undefined)
    assert.equal(attr(span, 'gen_ai.request.model'), undefined)
    assert.equal(attr(span, 'gen_ai.usage.input_tokens'), undefined)
    assert.equal(attr(span, 'gen_ai.usage.output_tokens'), undefined)
  }
})

test('waiting approval maps to an unset tool span with an approval_requested event', async () => {
  const { waiting } = await runUntilWaitingApproval()
  const spans = spansOf(waiting)
  const noteTool = spans.find((span) => span.name === 'execute_tool save_learning_note')!

  assert.equal(noteTool.status.code, 'STATUS_CODE_UNSET')
  assert.deepEqual(noteTool.events.map((event) => event.name), ['guard_check', 'approval_requested'])
  assert.ok(strAttr(noteTool, 'gen_ai.tool.call.arguments')!.includes('Agent 工程学习笔记'))
  assert.equal(attr(noteTool, 'gen_ai.tool.call.result'), undefined)
  assert.equal(spans[0].status.code, 'STATUS_CODE_UNSET')
  assert.equal(strAttr(spans[0], 'liujixue.runtime.run.status'), 'waiting_approval')
})

test('rejected approval closes the tool span unset with an approval_rejected event', async () => {
  const { waiting, checkpoint } = await runUntilWaitingApproval()
  const rejected = await runServerAgent({
    goal: waiting.goal,
    planner: createFixturePlanner(),
    permissions: WRITE_PERMISSIONS,
    resumeFrom: checkpoint,
    approvalDecision: 'reject'
  })
  assert.equal(rejected.status, 'rejected')

  const spans = spansOf(rejected)
  const noteTool = spans.find((span) => span.name === 'execute_tool save_learning_note')!
  assert.equal(noteTool.status.code, 'STATUS_CODE_UNSET')
  assert.deepEqual(noteTool.events.map((event) => event.name), ['guard_check', 'approval_requested', 'approval_rejected'])
  assert.equal(attr(noteTool, 'gen_ai.tool.call.result'), undefined)
  assert.equal(spans[0].status.code, 'STATUS_CODE_UNSET')
  assert.ok(spans[0].events.some((event) => event.name === 'run_resumed'))
})

test('approved write executes once and maps an ok tool span with result and both approval events', async () => {
  const { waiting, checkpoint } = await runUntilWaitingApproval()
  const approved = await runServerAgent({
    goal: waiting.goal,
    planner: createFixturePlanner(),
    actorId: 'actor-otel-approve',
    permissions: WRITE_PERMISSIONS,
    resumeFrom: checkpoint,
    approvalDecision: 'approve',
    saveLearningNote: async (note) => ({
      id: 'note-otel-1',
      title: note.title,
      content: note.content,
      createdAt: new Date().toISOString(),
      idempotencyKey: note.idempotencyKey,
      created: true
    })
  })
  assert.equal(approved.status, 'completed')

  const spans = spansOf(approved)
  const noteTool = spans.find((span) => span.name === 'execute_tool save_learning_note')!
  assert.equal(noteTool.status.code, 'STATUS_CODE_OK')
  assert.deepEqual(noteTool.events.map((event) => event.name), ['guard_check', 'approval_requested', 'approval_approved'])
  assert.ok(strAttr(noteTool, 'gen_ai.tool.call.result')!.includes('note-otel-1'))
  assert.equal(spans[0].status.code, 'STATUS_CODE_OK')
})

test('failed tool observations map error status with low-cardinality error type', async () => {
  const run = await runServerAgent({ goal: READ_GOAL, planner: createFixturePlanner(), permissions: [] })
  assert.equal(run.status, 'completed')
  assert.ok(run.observations.every((observation) => !observation.ok))

  const spans = spansOf(run)
  const toolSpans = spans.filter((span) => span.name.startsWith('execute_tool'))
  assert.equal(toolSpans.length, 2)
  for (const toolSpan of toolSpans) {
    assert.equal(toolSpan.status.code, 'STATUS_CODE_ERROR')
    assert.equal(strAttr(toolSpan, 'error.type'), '_OTHER')
    assert.match(toolSpan.status.message ?? '', /权限/)
    assert.equal(attr(toolSpan, 'gen_ai.tool.call.result'), undefined)
  }
  assert.equal(spans[0].status.code, 'STATUS_CODE_OK')
})

test('budget guard maps the blocked call and the root span to budget_exceeded errors', async () => {
  const run = await runServerAgent({ goal: READ_GOAL, planner: createFixturePlanner(), maxSteps: 1 })
  assert.equal(run.status, 'budget_exceeded')

  const spans = spansOf(run)
  const blockedTool = spans.find((span) => span.name === 'execute_tool inspect_project_evidence')!
  assert.equal(blockedTool.status.code, 'STATUS_CODE_ERROR')
  assert.equal(strAttr(blockedTool, 'error.type'), 'budget_exceeded')
  assert.deepEqual(blockedTool.events.map((event) => event.name), ['guard_check'])
  assert.equal(attr(blockedTool, 'gen_ai.tool.call.result'), undefined)

  assert.equal(spans[0].status.code, 'STATUS_CODE_ERROR')
  assert.equal(strAttr(spans[0], 'error.type'), 'budget_exceeded')
})

test('export keeps the OTLP-ish resource and scope envelope with typed attribute values', async () => {
  const run = await runServerAgent({ goal: READ_GOAL, planner: createScriptedOpenAiPlanner() })
  const exported = mapRunToOtelTrace(run, { startedAtUnixMs: 1_700_000_000_000 })

  assert.equal(exported.resourceSpans.length, 1)
  const resource = exported.resourceSpans[0]
  assert.deepEqual(
    resource.resource.attributes.find((attribute) => attribute.key === 'service.name'),
    { key: 'service.name', value: { stringValue: 'liujixue-agent-runtime' } }
  )
  assert.equal(resource.scopeSpans.length, 1)
  assert.deepEqual(resource.scopeSpans[0].scope, { name: '@liujixue/agent-runtime', version: '1' })

  for (const span of resource.scopeSpans[0].spans) {
    for (const attribute of span.attributes) {
      const valueKeys = Object.keys(attribute.value)
      assert.equal(valueKeys.length, 1)
      assert.ok(['stringValue', 'intValue', 'doubleValue', 'boolValue'].includes(valueKeys[0]))
      if ('intValue' in attribute.value) assert.equal(typeof attribute.value.intValue, 'string')
    }
  }
})
