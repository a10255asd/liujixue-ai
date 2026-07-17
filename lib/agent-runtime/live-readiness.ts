import { getRuntimeBaselinePricing } from './baseline'
import { resolveRedisRestConfig } from './redis-rest'

export type AgentLiveReadinessCheck = {
  id: 'api-key' | 'model' | 'pricing' | 'runtime-mode' | 'redis' | 'session-secret'
  passed: boolean
  detail: string
}

export type AgentLiveReadinessReport = {
  schemaVersion: 1
  baselineReady: boolean
  productionReady: boolean
  model: string | null
  checks: AgentLiveReadinessCheck[]
  nextActions: string[]
}

export function inspectAgentLiveReadiness(
  env: Readonly<Record<string, string | undefined>> = process.env
): AgentLiveReadinessReport {
  const apiKeyConfigured = Boolean(env.OPENAI_API_KEY?.trim())
  const model = env.OPENAI_AGENT_MODEL?.trim() || null
  const pricingKnown = model ? Boolean(getRuntimeBaselinePricing(model)) : false
  const runtimeModeEnabled = env.AGENT_RUNTIME_MODE === 'openai'
  const redisConfigured = Boolean(resolveRedisRestConfig(env))
  const sessionSecretConfigured = Boolean(env.AGENT_SESSION_SECRET && env.AGENT_SESSION_SECRET.length >= 32)

  const checks: AgentLiveReadinessCheck[] = [
    {
      id: 'api-key',
      passed: apiKeyConfigured,
      detail: apiKeyConfigured ? '已配置服务端模型密钥' : '缺少 OPENAI_API_KEY'
    },
    {
      id: 'model',
      passed: Boolean(model),
      detail: model ? `已显式选择模型 ${model}` : '缺少 OPENAI_AGENT_MODEL'
    },
    {
      id: 'pricing',
      passed: pricingKnown,
      detail: pricingKnown ? '模型已有版本化成本快照' : '所选模型缺少成本快照'
    },
    {
      id: 'runtime-mode',
      passed: runtimeModeEnabled,
      detail: runtimeModeEnabled ? '真实模型运行模式已启用' : 'AGENT_RUNTIME_MODE 尚未设为 openai'
    },
    {
      id: 'redis',
      passed: redisConfigured,
      detail: redisConfigured ? 'Redis REST 配置完整' : 'Redis REST URL 或 Token 不完整'
    },
    {
      id: 'session-secret',
      passed: sessionSecretConfigured,
      detail: sessionSecretConfigured ? '签名会话密钥满足最小长度' : 'AGENT_SESSION_SECRET 缺失或少于 32 字符'
    }
  ]
  const baselineReady = checks.filter((check) => ['api-key', 'model', 'pricing'].includes(check.id)).every((check) => check.passed)
  const productionReady = baselineReady && checks.every((check) => check.passed)

  return {
    schemaVersion: 1,
    baselineReady,
    productionReady,
    model,
    checks,
    nextActions: checks.filter((check) => !check.passed).map((check) => check.detail)
  }
}
