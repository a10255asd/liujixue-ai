import { z } from 'zod'

import { getKnowledgePoints, getProjectBySlug } from '@/lib/content/repository'

import { runtimeToolNameSchema, type RuntimeToolName, type RuntimeToolObservation } from './contracts'

const searchKnowledgeInputSchema = z.object({
  query: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(5)
}).strict()

const inspectProjectInputSchema = z.object({
  slug: z.string().trim().min(2).max(80)
}).strict()

const toolContracts = {
  search_knowledge: {
    label: '检索 AI 工程知识库',
    permission: 'knowledge:read',
    inputSchema: searchKnowledgeInputSchema
  },
  inspect_project_evidence: {
    label: '读取项目交付证据',
    permission: 'projects:read',
    inputSchema: inspectProjectInputSchema
  }
} as const

export const runtimeToolDefinitions = [
  {
    type: 'function',
    name: 'search_knowledge',
    description: '在刘鸡血 AI 学习库的已发布知识点中检索与任务相关的工程知识。只读，不访问互联网。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '需要检索的具体 AI 工程问题或关键词。' },
        limit: { type: 'integer', minimum: 1, maximum: 5, description: '返回结果数，必须在 1 到 5 之间。' }
      },
      required: ['query', 'limit'],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: 'inspect_project_evidence',
    description: '读取一个已发布项目的成熟度、验证命令和证据产物。只读，不修改项目。',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: '项目 slug，例如 task-planning-agent。' }
      },
      required: ['slug'],
      additionalProperties: false
    },
    strict: true
  }
] as const

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '')
}

function searchKnowledge(query: string, limit: number) {
  const normalizedQuery = normalize(query)
  const latinTerms = query.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? []
  const chineseTerms = query.match(/[\u4e00-\u9fff]{2,}/g) ?? []
  const terms = [...new Set([...latinTerms, ...chineseTerms])]

  return getKnowledgePoints()
    .map((item) => {
      const title = normalize(item.title)
      const haystack = normalize(`${item.title} ${item.summary} ${item.category} ${item.explanation}`)
      const score = (title && normalizedQuery.includes(title) ? 12 : 0) +
        terms.reduce((sum, term) => sum + (haystack.includes(normalize(term)) ? 3 : 0), 0)
      return { item, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'zh-CN'))
    .slice(0, limit)
    .map(({ item, score }) => ({
      slug: item.slug,
      title: item.title,
      category: item.category,
      level: item.level,
      summary: item.summary,
      score,
      href: `/knowledge/${item.slug}`
    }))
}

export function getRuntimeToolContracts() {
  return Object.entries(toolContracts).map(([name, contract]) => ({
    name: runtimeToolNameSchema.parse(name),
    label: contract.label,
    permission: contract.permission,
    risk: 'read' as const
  }))
}

export async function executeRuntimeTool(input: {
  callId: string
  name: RuntimeToolName
  arguments: Record<string, unknown>
  permissions: string[]
}): Promise<RuntimeToolObservation> {
  const startedAt = Date.now()
  const contract = toolContracts[input.name]

  if (!input.permissions.includes(contract.permission)) {
    return {
      ...input,
      ok: false,
      permission: contract.permission,
      durationMs: Date.now() - startedAt,
      output: null,
      error: `缺少 ${contract.permission} 权限`
    }
  }

  try {
    if (input.name === 'search_knowledge') {
      const args = searchKnowledgeInputSchema.parse(input.arguments)
      const items = searchKnowledge(args.query, args.limit)
      return {
        ...input,
        ok: true,
        permission: contract.permission,
        durationMs: Date.now() - startedAt,
        output: { query: args.query, count: items.length, items }
      }
    }

    const args = inspectProjectInputSchema.parse(input.arguments)
    const project = getProjectBySlug(args.slug)
    if (!project) throw new Error(`未找到项目：${args.slug}`)
    return {
      ...input,
      ok: true,
      permission: contract.permission,
      durationMs: Date.now() - startedAt,
      output: {
        slug: project.slug,
        title: project.title,
        deliveryStatus: project.deliveryStatus,
        evidenceSummary: project.evidence.summary,
        commands: project.evidence.commands,
        artifacts: project.evidence.artifacts,
        demoPath: project.evidence.demoPath ?? null,
        href: `/projects/${project.slug}`
      }
    }
  } catch (error) {
    return {
      ...input,
      ok: false,
      permission: contract.permission,
      durationMs: Date.now() - startedAt,
      output: null,
      error: error instanceof Error ? error.message : '工具输入或执行失败'
    }
  }
}
