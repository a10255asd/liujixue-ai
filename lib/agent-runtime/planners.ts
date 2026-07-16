import { z } from 'zod'

import type { PlannerContext, PlannerTurn, RuntimePlanner, RuntimeToolCall, RuntimeUsage } from './contracts'
import { runtimeToolDefinitions } from './tools'

const emptyUsage: RuntimeUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

const projectAliases: Array<[RegExp, string]> = [
  [/task-planning-agent|受控任务执行/i, 'task-planning-agent'],
  [/rag-knowledge-base|RAG 企业知识库/i, 'rag-knowledge-base'],
  [/prompt-debugger|Prompt 调试/i, 'prompt-debugger'],
  [/agent-evaluation-console|Agent 评测控制台/i, 'agent-evaluation-console'],
  [/mcp-file-assistant|MCP 文件助手/i, 'mcp-file-assistant'],
  [/ai-interviewer|AI 面试官/i, 'ai-interviewer']
]

function projectSlugFor(goal: string) {
  return projectAliases.find(([pattern]) => pattern.test(goal))?.[1]
}

export function planFixtureTools(goal: string): RuntimeToolCall[] {
  const projectSlug = projectSlugFor(goal)
  const needsProject = Boolean(projectSlug) || /(项目证据|项目成熟度|项目验收)/.test(goal)
  const needsKnowledge = /(查找|检索|知识|解释|学习|面试|什么|怎么|资料|原理|对比)/.test(goal)
  const calls: RuntimeToolCall[] = []

  if (needsKnowledge || !needsProject) {
    calls.push({ callId: 'fixture-search-1', name: 'search_knowledge', arguments: { query: goal, limit: 3 } })
  }
  if (needsProject) {
    calls.push({
      callId: 'fixture-project-1',
      name: 'inspect_project_evidence',
      arguments: { slug: projectSlug ?? 'task-planning-agent' }
    })
  }
  return calls
}

function fixtureSummary(context: PlannerContext) {
  const successes = context.observations.filter((item) => item.ok)
  const failures = context.observations.filter((item) => !item.ok)
  const parts = successes.map((item) => {
    if (item.name === 'search_knowledge') {
      const output = item.output as { count?: number; items?: Array<{ title: string }> }
      return `知识库检索返回 ${output.count ?? 0} 条结果${output.items?.length ? `：${output.items.map((entry) => entry.title).join('、')}` : ''}`
    }
    const output = item.output as { title?: string; deliveryStatus?: string }
    return `项目「${output.title ?? '未知项目'}」当前成熟度为 ${output.deliveryStatus ?? 'unknown'}`
  })
  if (failures.length) parts.push(`${failures.length} 个工具调用失败，已保留错误轨迹`)
  return parts.length ? `${parts.join('；')}。` : '没有获得足够的工具证据。'
}

export function createFixturePlanner(): RuntimePlanner {
  return {
    mode: 'fixture',
    model: 'deterministic-server-planner-v1',
    async next(context) {
      const plannedCalls = planFixtureTools(context.goal)
      const completedNames = context.observations.map((item) => item.name)
      const nextCall = plannedCalls.find((call, index) => completedNames[index] !== call.name)
      if (nextCall) return { calls: [nextCall], rawOutput: [], usage: emptyUsage }
      return { calls: [], finalText: fixtureSummary(context), rawOutput: [], usage: emptyUsage }
    }
  }
}

const openAiResponseSchema = z.object({
  output: z.array(z.unknown()),
  output_text: z.string().optional(),
  usage: z.object({
    input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional()
  }).optional()
})

const functionCallSchema = z.object({
  type: z.literal('function_call'),
  call_id: z.string(),
  name: z.enum(['search_knowledge', 'inspect_project_evidence']),
  arguments: z.string()
})

function extractOutputText(output: unknown[]) {
  for (const item of output) {
    const parsed = z.object({
      type: z.literal('message'),
      content: z.array(z.object({ type: z.literal('output_text'), text: z.string() }))
    }).safeParse(item)
    if (parsed.success) return parsed.data.content.map((part) => part.text).join('\n')
  }
  return undefined
}

export function createOpenAiPlanner(options: { apiKey: string; model?: string; fetchImpl?: typeof fetch }): RuntimePlanner {
  const model = options.model ?? 'gpt-5.6-luna'
  const fetchImpl = options.fetchImpl ?? fetch
  return {
    mode: 'openai',
    model,
    async next(context): Promise<PlannerTurn> {
      const response = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          instructions: '你是受控 AI 工程学习助手。只使用提供的只读工具收集证据；不要虚构工具、项目状态或外部事实。获得证据后用中文简洁总结，并明确证据路径。',
          input: context.history,
          tools: runtimeToolDefinitions,
          tool_choice: 'auto',
          parallel_tool_calls: false,
          reasoning: { effort: 'low' },
          max_output_tokens: 900,
          store: false
        })
      })
      if (!response.ok) {
        const requestId = response.headers.get('x-request-id')
        throw new Error(`OpenAI Responses API 返回 ${response.status}${requestId ? `，request id ${requestId}` : ''}`)
      }
      const parsed = openAiResponseSchema.parse(await response.json())
      const calls = parsed.output.flatMap((item) => {
        const call = functionCallSchema.safeParse(item)
        if (!call.success) return []
        let argumentsValue: Record<string, unknown>
        try {
          argumentsValue = JSON.parse(call.data.arguments) as Record<string, unknown>
        } catch {
          argumentsValue = {}
        }
        return [{ callId: call.data.call_id, name: call.data.name, arguments: argumentsValue }]
      })
      return {
        calls,
        finalText: parsed.output_text ?? extractOutputText(parsed.output),
        rawOutput: parsed.output,
        requestId: response.headers.get('x-request-id') ?? undefined,
        usage: {
          inputTokens: parsed.usage?.input_tokens ?? 0,
          outputTokens: parsed.usage?.output_tokens ?? 0,
          totalTokens: parsed.usage?.total_tokens ?? 0
        }
      }
    }
  }
}
