import { NextResponse } from 'next/server'

import { handleMcpPayload, MCP_ERROR_CODES } from '@/lib/agent-runtime/mcp'
import { createRuntimeRateLimiter, getRuntimeClientIdentifier } from '@/lib/agent-runtime/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store' }
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

// streamable HTTP transport 的 GET 用于打开 SSE 流；本 server 只支持单请求模式，明确返回 405。
export async function GET() {
  return NextResponse.json(
    {
      error: '本 MCP server 只支持 POST 单请求模式，不提供 SSE 流。',
      transport: 'streamable-http-single-request',
      methods: ['initialize', 'notifications/initialized', 'ping', 'tools/list', 'tools/call']
    },
    { status: 405, headers: { ...noStoreHeaders(), Allow: 'POST' } }
  )
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      jsonRpcError(null, MCP_ERROR_CODES.INVALID_REQUEST, 'Content-Type 必须是 application/json。'),
      { status: 415, headers: noStoreHeaders() }
    )
  }

  const limiter = createRuntimeRateLimiter()
  let rateLimit
  try {
    rateLimit = await limiter.consume({
      identifier: `mcp:${getRuntimeClientIdentifier(request)}`,
      limit: 30,
      windowSeconds: 60
    })
  } catch {
    return NextResponse.json(
      jsonRpcError(null, MCP_ERROR_CODES.INTERNAL_ERROR, '请求限流守卫暂时不可用。'),
      { status: 503, headers: noStoreHeaders() }
    )
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      jsonRpcError(null, MCP_ERROR_CODES.RATE_LIMITED, '请求过于频繁，请在限流窗口重置后重试。'),
      {
        status: 429,
        headers: {
          ...noStoreHeaders(),
          'Retry-After': String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)))
        }
      }
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      jsonRpcError(null, MCP_ERROR_CODES.PARSE_ERROR, '请求体不是合法 JSON。'),
      { status: 400, headers: noStoreHeaders() }
    )
  }

  const result = await handleMcpPayload(payload)
  if (result.body === null) {
    return new NextResponse(null, { status: result.status, headers: noStoreHeaders() })
  }
  return NextResponse.json(result.body, { status: result.status, headers: noStoreHeaders() })
}
