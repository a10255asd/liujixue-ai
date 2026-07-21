import { randomUUID } from 'node:crypto'

import { z } from 'zod'

import { runtimeToolNameSchema, type RuntimeToolName } from './contracts'
import { executeRuntimeTool, getRuntimeToolContract, runtimeToolDefinitions } from './tools'

export const MCP_PROTOCOL_VERSION = '2025-06-18'
export const MCP_SERVER_INFO = { name: 'liujixue-ai-learning-tools', version: '1.0.0' } as const

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  RATE_LIMITED: -32000
} as const

const supportedProtocolVersions = ['2024-11-05', '2025-03-26', '2025-06-18'] as const

// 工具清单、输入 Schema、权限守卫和执行逻辑全部复用 tools.ts 的单一实现。
// 只有 risk 为 read 的工具经 MCP 暴露；save_learning_note 是写工具，只走站内 Web 审批通道。
const mcpToolDefinitions = runtimeToolDefinitions.filter(
  (definition) => getRuntimeToolContract(definition.name).risk === 'read'
)
const mcpToolNames = new Set<string>(mcpToolDefinitions.map((definition) => definition.name))
const mcpToolPermissions = [
  ...new Set(mcpToolDefinitions.map((definition) => getRuntimeToolContract(definition.name).permission))
]

export type McpJsonRpcErrorBody = {
  jsonrpc: '2.0'
  id: string | number | null
  error: { code: number; message: string; data?: unknown }
}

export type McpJsonRpcResultBody = {
  jsonrpc: '2.0'
  id: string | number | null
  result: unknown
}

export type McpHttpResult = {
  status: number
  body: McpJsonRpcResultBody | McpJsonRpcErrorBody | null
}

const jsonRpcIdSchema = z.union([z.string().min(1).max(120), z.number().int(), z.null()])

const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: jsonRpcIdSchema.optional(),
  method: z.string().min(1).max(120),
  params: z.unknown().optional()
}).strict()

// initialize 的 params 允许携带未来字段（capabilities 会随协议演进扩展），
// 但 protocolVersion 必须是字符串，否则无法进行版本协商。
const initializeParamsSchema = z.object({
  protocolVersion: z.string().min(1).max(40),
  capabilities: z.record(z.unknown()).optional(),
  clientInfo: z.object({ name: z.string().max(120) }).passthrough().optional()
}).passthrough()

const listToolsParamsSchema = z.object({
  cursor: z.string().max(200).optional()
}).passthrough()

const callToolParamsSchema = z.object({
  name: z.string().min(1).max(80),
  arguments: z.record(z.unknown()).optional()
}).strict()

export function listMcpTools() {
  return mcpToolDefinitions.map((definition) => ({
    name: definition.name,
    description: definition.description,
    inputSchema: definition.parameters,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  }))
}

function protocolError(
  id: string | number | null,
  code: number,
  message: string,
  status = 200,
  data?: unknown
): McpHttpResult {
  return {
    status,
    body: {
      jsonrpc: '2.0',
      id,
      error: data === undefined ? { code, message } : { code, message, data }
    }
  }
}

function protocolResult(id: string | number | null, result: unknown): McpHttpResult {
  return { status: 200, body: { jsonrpc: '2.0', id, result } }
}

export async function handleMcpPayload(payload: unknown): Promise<McpHttpResult> {
  if (Array.isArray(payload)) {
    return protocolError(
      null,
      MCP_ERROR_CODES.INVALID_REQUEST,
      '本端点按 streamable HTTP 的单请求模式运行，不支持 JSON-RPC batch。',
      400
    )
  }

  const parsed = jsonRpcRequestSchema.safeParse(payload)
  if (!parsed.success) {
    return protocolError(
      null,
      MCP_ERROR_CODES.INVALID_REQUEST,
      '不是合法的 JSON-RPC 2.0 请求：需要 jsonrpc 与 method 字段，id 只能是字符串、整数或 null，不允许其它字段。',
      400
    )
  }

  const request = parsed.data

  // JSON-RPC 通知不应答：notifications/initialized 与其它 notifications/* 一律返回 202 空响应。
  if (request.method.startsWith('notifications/')) {
    return { status: 202, body: null }
  }

  // MCP 的请求-响应方法必须携带 id，否则结果无法回传。
  if (request.id === undefined) {
    return protocolError(
      null,
      MCP_ERROR_CODES.INVALID_REQUEST,
      `${request.method} 是请求-响应方法，必须携带 id。`,
      400
    )
  }

  if (request.method === 'initialize') {
    const params = initializeParamsSchema.safeParse(request.params)
    if (!params.success) {
      return protocolError(request.id, MCP_ERROR_CODES.INVALID_PARAMS, 'initialize 需要 params.protocolVersion（字符串）。')
    }
    const requested = params.data.protocolVersion
    const protocolVersion = (supportedProtocolVersions as readonly string[]).includes(requested)
      ? requested
      : MCP_PROTOCOL_VERSION
    return protocolResult(request.id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: MCP_SERVER_INFO,
      instructions: '刘鸡血 AI 学习库的最小 MCP server：只暴露两个只读工具；写工具不经 MCP 暴露，只走站内人工审批通道。'
    })
  }

  if (request.method === 'ping') {
    return protocolResult(request.id, {})
  }

  if (request.method === 'tools/list') {
    if (request.params !== undefined) {
      const params = listToolsParamsSchema.safeParse(request.params)
      if (!params.success) {
        return protocolError(request.id, MCP_ERROR_CODES.INVALID_PARAMS, 'tools/list 的 params 只能是对象。')
      }
    }
    return protocolResult(request.id, { tools: listMcpTools() })
  }

  if (request.method === 'tools/call') {
    const params = callToolParamsSchema.safeParse(request.params)
    if (!params.success) {
      return protocolError(
        request.id,
        MCP_ERROR_CODES.INVALID_PARAMS,
        'tools/call 需要 params.name（字符串）与可选的 params.arguments（对象），不允许其它字段。'
      )
    }

    if (!mcpToolNames.has(params.data.name)) {
      const isRuntimeTool = runtimeToolNameSchema.safeParse(params.data.name).success
      return protocolError(
        request.id,
        MCP_ERROR_CODES.INVALID_PARAMS,
        isRuntimeTool
          ? `${params.data.name} 是写工具，只走站内人工审批通道，不经 MCP 暴露。`
          : `未知工具：${params.data.name}。`,
        200,
        { exposedTools: [...mcpToolNames] }
      )
    }

    try {
      const observation = await executeRuntimeTool({
        callId: `mcp-${randomUUID()}`,
        name: params.data.name as RuntimeToolName,
        arguments: params.data.arguments ?? {},
        permissions: mcpToolPermissions
      })

      if (!observation.ok) {
        return protocolResult(request.id, {
          content: [{ type: 'text', text: observation.error ?? '工具执行失败。' }],
          isError: true
        })
      }

      return protocolResult(request.id, {
        content: [{ type: 'text', text: JSON.stringify(observation.output, null, 2) }],
        structuredContent: observation.output as Record<string, unknown>,
        isError: false
      })
    } catch {
      return protocolError(request.id, MCP_ERROR_CODES.INTERNAL_ERROR, '工具执行出现未预期错误。')
    }
  }

  return protocolError(request.id, MCP_ERROR_CODES.METHOD_NOT_FOUND, `未知 method：${request.method}`)
}
