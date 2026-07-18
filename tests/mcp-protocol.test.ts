import assert from 'node:assert/strict'
import test from 'node:test'

import {
  handleMcpPayload,
  listMcpTools,
  MCP_ERROR_CODES,
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_INFO
} from '../lib/agent-runtime/mcp'
import { runtimeToolDefinitions } from '../lib/agent-runtime/tools'

type RpcBody = {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

async function call(payload: unknown) {
  const response = await handleMcpPayload(payload)
  return { status: response.status, body: response.body as RpcBody | null }
}

test('initialize negotiates the protocol version and returns server capabilities', async () => {
  const supported = await call({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'unit-test', version: '0.1.0' } }
  })
  assert.equal(supported.status, 200)
  assert.equal(supported.body?.id, 1)
  const supportedResult = supported.body?.result as {
    protocolVersion: string
    capabilities: { tools: { listChanged: boolean } }
    serverInfo: { name: string; version: string }
  }
  assert.equal(supportedResult.protocolVersion, '2025-03-26')
  assert.deepEqual(supportedResult.serverInfo, MCP_SERVER_INFO)
  assert.equal(supportedResult.capabilities.tools.listChanged, false)

  const fallback = await call({
    jsonrpc: '2.0',
    id: 'init-2',
    method: 'initialize',
    params: { protocolVersion: '1999-01-01' }
  })
  const fallbackResult = fallback.body?.result as { protocolVersion: string }
  assert.equal(fallback.status, 200)
  assert.equal(fallback.body?.id, 'init-2')
  assert.equal(fallbackResult.protocolVersion, MCP_PROTOCOL_VERSION)

  const missingVersion = await call({ jsonrpc: '2.0', id: 3, method: 'initialize', params: {} })
  assert.equal(missingVersion.body?.error?.code, MCP_ERROR_CODES.INVALID_PARAMS)
})

test('notifications/initialized is acknowledged with 202 and no response body', async () => {
  const initialized = await call({ jsonrpc: '2.0', method: 'notifications/initialized' })
  assert.equal(initialized.status, 202)
  assert.equal(initialized.body, null)

  const unknownNotification = await call({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1 } })
  assert.equal(unknownNotification.status, 202)
  assert.equal(unknownNotification.body, null)
})

test('ping returns an empty result and echoes the request id', async () => {
  const response = await call({ jsonrpc: '2.0', id: 'ping-1', method: 'ping' })
  assert.equal(response.status, 200)
  assert.equal(response.body?.id, 'ping-1')
  assert.deepEqual(response.body?.result, {})
})

test('tools/list exposes exactly the two read-only tools with strict schemas', async () => {
  const response = await call({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
  assert.equal(response.status, 200)
  const result = response.body?.result as {
    tools: Array<{
      name: string
      description: string
      inputSchema: {
        type: string
        properties: Record<string, unknown>
        required: string[]
        additionalProperties: boolean
      }
      annotations: { readOnlyHint: boolean }
    }>
  }

  assert.equal(result.tools.length, 2)
  assert.deepEqual(
    result.tools.map((tool) => tool.name).sort(),
    ['inspect_project_evidence', 'search_knowledge']
  )
  assert.ok(!result.tools.some((tool) => tool.name === 'save_learning_note'))

  for (const tool of result.tools) {
    assert.ok(tool.description.length > 10)
    assert.equal(tool.inputSchema.type, 'object')
    assert.equal(tool.inputSchema.additionalProperties, false)
    assert.deepEqual(
      Object.keys(tool.inputSchema.properties).sort(),
      [...tool.inputSchema.required].sort()
    )
    assert.equal(tool.annotations.readOnlyHint, true)

    // Schema 必须直接来自受控 Agent 运行时的工具定义，不允许出现第二份实现。
    const definition = runtimeToolDefinitions.find((item) => item.name === tool.name)
    assert.ok(definition)
    assert.deepEqual(tool.inputSchema, definition.parameters)
    assert.equal(tool.description, definition.description)
  }
})

test('tools/call runs search_knowledge through the shared runtime guard', async () => {
  const response = await call({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'search_knowledge', arguments: { query: 'Agent 停止条件', limit: 3 } }
  })
  assert.equal(response.status, 200)
  const result = response.body?.result as {
    content: Array<{ type: string; text: string }>
    structuredContent: { query: string; count: number; items: Array<{ slug: string; href: string }> }
    isError: boolean
  }
  assert.equal(result.isError, false)
  assert.ok(result.structuredContent.count > 0)
  assert.equal(result.content[0]?.type, 'text')
  assert.deepEqual(JSON.parse(result.content[0]?.text ?? 'null'), result.structuredContent)
  assert.ok(result.structuredContent.items.every((item) => item.href.startsWith('/knowledge/')))
})

test('tools/call runs inspect_project_evidence and keeps the honest status', async () => {
  const response = await call({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'inspect_project_evidence', arguments: { slug: 'task-planning-agent' } }
  })
  assert.equal(response.status, 200)
  const result = response.body?.result as {
    structuredContent: { slug: string; deliveryStatus: string; artifacts: string[] }
    isError: boolean
  }
  assert.equal(result.isError, false)
  assert.equal(result.structuredContent.slug, 'task-planning-agent')
  assert.equal(result.structuredContent.deliveryStatus, 'prototype')
  assert.ok(result.structuredContent.artifacts.length >= 2)
})

test('tools/call never exposes the approval-gated write tool', async () => {
  const response = await call({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'save_learning_note', arguments: { title: '不应写入', content: '这条笔记不允许经 MCP 创建。' } }
  })
  assert.equal(response.status, 200)
  assert.equal(response.body?.id, 5)
  assert.equal(response.body?.error?.code, MCP_ERROR_CODES.INVALID_PARAMS)
  assert.match(response.body?.error?.message ?? '', /审批|MCP/)
  const data = response.body?.error?.data as { exposedTools: string[] }
  assert.deepEqual([...data.exposedTools].sort(), ['inspect_project_evidence', 'search_knowledge'])
})

test('tools/call reports unknown tools and bad arguments as protocol or tool errors', async () => {
  const unknownTool = await call({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: 'delete_everything', arguments: {} }
  })
  assert.equal(unknownTool.body?.error?.code, MCP_ERROR_CODES.INVALID_PARAMS)
  assert.match(unknownTool.body?.error?.message ?? '', /未知工具/)

  const badArguments = await call({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name: 'search_knowledge', arguments: { query: 'Agent 停止条件', limit: 9 } }
  })
  const toolError = badArguments.body?.result as { isError: boolean; content: Array<{ type: string; text: string }> }
  assert.equal(badArguments.body?.error, undefined)
  assert.equal(toolError.isError, true)
  assert.equal(toolError.content[0]?.type, 'text')

  const badParams = await call({
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/call',
    params: { name: 'search_knowledge', arguments: { limit: 3 }, extra: true }
  })
  assert.equal(badParams.body?.error?.code, MCP_ERROR_CODES.INVALID_PARAMS)
})

test('unknown methods return JSON-RPC method not found', async () => {
  const response = await call({ jsonrpc: '2.0', id: 9, method: 'resources/list' })
  assert.equal(response.status, 200)
  assert.equal(response.body?.id, 9)
  assert.equal(response.body?.error?.code, MCP_ERROR_CODES.METHOD_NOT_FOUND)
  assert.match(response.body?.error?.message ?? '', /resources\/list/)
})

test('malformed JSON-RPC envelopes are rejected with invalid request', async () => {
  const missingVersion = await call({ id: 1, method: 'ping' })
  assert.equal(missingVersion.status, 400)
  assert.equal(missingVersion.body?.error?.code, MCP_ERROR_CODES.INVALID_REQUEST)
  assert.equal(missingVersion.body?.id, null)

  const wrongVersion = await call({ jsonrpc: '1.9', id: 1, method: 'ping' })
  assert.equal(wrongVersion.status, 400)
  assert.equal(wrongVersion.body?.error?.code, MCP_ERROR_CODES.INVALID_REQUEST)

  const batch = await call([
    { jsonrpc: '2.0', id: 1, method: 'ping' },
    { jsonrpc: '2.0', id: 2, method: 'ping' }
  ])
  assert.equal(batch.status, 400)
  assert.equal(batch.body?.error?.code, MCP_ERROR_CODES.INVALID_REQUEST)

  const notAnObject = await call('ping')
  assert.equal(notAnObject.status, 400)
  assert.equal(notAnObject.body?.error?.code, MCP_ERROR_CODES.INVALID_REQUEST)

  const missingId = await call({ jsonrpc: '2.0', method: 'tools/list' })
  assert.equal(missingId.status, 400)
  assert.equal(missingId.body?.error?.code, MCP_ERROR_CODES.INVALID_REQUEST)
  assert.match(missingId.body?.error?.message ?? '', /id/)

  const extraField = await call({ jsonrpc: '2.0', id: 1, method: 'ping', meta: {} })
  assert.equal(extraField.status, 400)
  assert.equal(extraField.body?.error?.code, MCP_ERROR_CODES.INVALID_REQUEST)
})

test('string, integer and null ids are echoed without coercion', async () => {
  const stringId = await call({ jsonrpc: '2.0', id: 'req-abc', method: 'ping' })
  assert.equal(stringId.body?.id, 'req-abc')

  const integerId = await call({ jsonrpc: '2.0', id: 42, method: 'ping' })
  assert.equal(integerId.body?.id, 42)

  const nullId = await call({ jsonrpc: '2.0', id: null, method: 'ping' })
  assert.equal(nullId.status, 200)
  assert.equal(nullId.body?.id, null)
  assert.deepEqual(nullId.body?.result, {})
})

test('listMcpTools stays in sync with the runtime read-only contracts', () => {
  const tools = listMcpTools()
  assert.equal(tools.length, 2)
  for (const tool of tools) {
    const definition = runtimeToolDefinitions.find((item) => item.name === tool.name)
    assert.ok(definition)
    assert.deepEqual(tool.inputSchema, definition.parameters)
  }
})
