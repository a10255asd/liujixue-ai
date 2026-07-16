import { z } from 'zod'

export const runtimeGoalSchema = z.object({
  goal: z.string().trim().min(8, '任务目标至少需要 8 个字符').max(500, '任务目标不能超过 500 个字符')
})

export const runtimeToolNameSchema = z.enum(['search_knowledge', 'inspect_project_evidence'])

export type RuntimeToolName = z.infer<typeof runtimeToolNameSchema>
export type RuntimeMode = 'fixture' | 'openai'
export type RuntimePersistence = 'response-only' | 'ephemeral-memory' | 'redis-24h'
export type RuntimeRunStatus = 'completed' | 'failed' | 'budget_exceeded'

export type RuntimeToolCall = {
  callId: string
  name: RuntimeToolName
  arguments: Record<string, unknown>
}

export type RuntimeToolObservation = RuntimeToolCall & {
  ok: boolean
  permission: string
  durationMs: number
  output: unknown
  error?: string
}

export type RuntimeTraceEvent = {
  sequence: number
  elapsedMs: number
  type: 'run_started' | 'run_resumed' | 'planner_response' | 'tool_guard' | 'tool_result' | 'run_completed' | 'run_failed'
  title: string
  detail: string
  tool?: RuntimeToolName
  callId?: string
}

export type RuntimeUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type RuntimeRunResult = {
  runId: string
  mode: RuntimeMode
  model: string
  status: RuntimeRunStatus
  goal: string
  summary: string
  stepsUsed: number
  maxSteps: number
  observations: RuntimeToolObservation[]
  trace: RuntimeTraceEvent[]
  usage: RuntimeUsage
  requestIds: string[]
  persistence: RuntimePersistence
  replayUrl?: string
  rateLimit?: {
    mode: 'redis' | 'memory'
    limit: number
    remaining: number
    resetAt: number
  }
}

export type RuntimeCheckpoint = {
  version: 1
  runId: string
  goal: string
  mode: RuntimeMode
  model: string
  status: 'running' | RuntimeRunStatus
  nextTurnIndex: number
  maxSteps: number
  history: unknown[]
  observations: RuntimeToolObservation[]
  trace: RuntimeTraceEvent[]
  usage: RuntimeUsage
  requestIds: string[]
  summary?: string
  updatedAt: string
}

export type PlannerTurn = {
  calls: RuntimeToolCall[]
  finalText?: string
  rawOutput: unknown[]
  usage: RuntimeUsage
  requestId?: string
}

export type PlannerContext = {
  goal: string
  history: unknown[]
  observations: RuntimeToolObservation[]
}

export type RuntimePlanner = {
  mode: RuntimeMode
  model: string
  next(context: PlannerContext): Promise<PlannerTurn>
}
