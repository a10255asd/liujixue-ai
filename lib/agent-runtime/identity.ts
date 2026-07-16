import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'liujixue_agent_session'
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function verifyToken(token: string, secret: string) {
  const [actorId, issuedAtValue, signature, extra] = token.split('.')
  if (!actorId || !issuedAtValue || !signature || extra || !/^[0-9a-f-]{36}$/i.test(actorId)) return null
  const issuedAt = Number(issuedAtValue)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isInteger(issuedAt) || issuedAt > now + 300 || now - issuedAt > SESSION_TTL_SECONDS) return null
  const expected = sign(`${actorId}.${issuedAtValue}`, secret)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null
  return actorId
}

function cookieValue(request: Request) {
  const cookies = request.headers.get('cookie') ?? ''
  for (const part of cookies.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === COOKIE_NAME) return decodeURIComponent(value.join('='))
  }
  return null
}

export type RuntimeIdentity = {
  configured: boolean
  actorId: string
  setCookie?: string
}

export function resolveRuntimeIdentity(
  request: Request,
  options: { env?: NodeJS.ProcessEnv; createId?: () => string } = {}
): RuntimeIdentity {
  const env = options.env ?? process.env
  const secret = env.AGENT_SESSION_SECRET ?? (env.NODE_ENV === 'production' ? null : 'local-agent-session-secret-not-for-production')
  if (!secret || secret.length < 32) return { configured: false, actorId: 'public-readonly' }

  const current = cookieValue(request)
  const verified = current ? verifyToken(current, secret) : null
  if (verified) return { configured: true, actorId: verified }

  const actorId = (options.createId ?? randomUUID)()
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = `${actorId}.${issuedAt}`
  const token = `${payload}.${sign(payload, secret)}`
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return {
    configured: true,
    actorId,
    setCookie: `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax${secure}`
  }
}
