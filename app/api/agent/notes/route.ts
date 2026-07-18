import { NextResponse } from 'next/server'

import { resolveRuntimeIdentity, type RuntimeIdentity } from '@/lib/agent-runtime/identity'
import { createRuntimeRateLimiter } from '@/lib/agent-runtime/rate-limit'
import { createRuntimeStore } from '@/lib/agent-runtime/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}, identity?: RuntimeIdentity) {
  const response = NextResponse.json(body, init)
  if (identity?.setCookie) response.headers.set('Set-Cookie', identity.setCookie)
  return response
}

export async function GET(request: Request) {
  const identity = resolveRuntimeIdentity(request)
  const store = createRuntimeStore({ allowMemory: process.env.NODE_ENV !== 'production' })
  const base = {
    identityMode: identity.configured ? 'signed-session' : 'disabled',
    storageMode: store.persistence
  }

  if (!identity.configured) {
    return jsonResponse({ ...base, notes: [], reason: 'identity-disabled' }, { headers: noStoreHeaders() }, identity)
  }
  if (store.mode === 'disabled') {
    return jsonResponse({ ...base, notes: [], reason: 'storage-disabled' }, { headers: noStoreHeaders() }, identity)
  }
  if (identity.setCookie) {
    // 本次请求刚签发新会话，不可能存在历史笔记
    return jsonResponse({ ...base, notes: [], reason: 'no-session' }, { headers: noStoreHeaders() }, identity)
  }

  const limiter = createRuntimeRateLimiter()
  let rateLimit
  try {
    rateLimit = await limiter.consume({
      identifier: `notes:${identity.actorId}`,
      limit: 30,
      windowSeconds: 60
    })
  } catch {
    return jsonResponse({ error: '请求限流守卫暂时不可用。' }, { status: 503, headers: noStoreHeaders() }, identity)
  }
  if (!rateLimit.allowed) {
    return jsonResponse({ error: '笔记读取请求过于频繁。' }, {
      status: 429,
      headers: { ...rateLimitHeaders(rateLimit), 'Retry-After': '60' }
    }, identity)
  }

  try {
    const notes = (await store.listLearningNotes(identity.actorId)).map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      runId: note.idempotencyKey.split(':')[0] ?? null
    }))
    return jsonResponse({ ...base, notes, reason: null }, { headers: rateLimitHeaders(rateLimit) }, identity)
  } catch {
    return jsonResponse({ error: '学习笔记仓储暂时不可用。' }, { status: 503, headers: noStoreHeaders() }, identity)
  }
}
