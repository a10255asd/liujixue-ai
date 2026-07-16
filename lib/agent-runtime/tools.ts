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

const saveLearningNoteInputSchema = z.object({
  title: z.string().trim().min(2).max(80),
  content: z.string().trim().min(10).max(1200)
}).strict()

export type SavedLearningNote = {
  id: string
  title: string
  content: string
  createdAt: string
  idempotencyKey: string
  created: boolean
}

const toolContracts = {
  search_knowledge: {
    label: '检索 AI 工程知识库',
    permission: 'knowledge:read',
    inputSchema: searchKnowledgeInputSchema,
    risk: 'read'
  },
  inspect_project_evidence: {
    label: '读取项目交付证据',
    permission: 'projects:read',
    inputSchema: inspectProjectInputSchema,
    risk: 'read'
  },
  save_learning_note: {
    label: '保存学习笔记',
    permission: 'notes:write',
    inputSchema: saveLearningNoteInputSchema,
    risk: 'write'
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
  },
  {
    type: 'function',
    name: 'save_learning_note',
    description: '仅在用户明确要求保存时，将本次学习结果写入其隔离的学习笔记。该工具有副作用，执行前必须获得用户审批。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '简短、具体的笔记标题。' },
        content: { type: 'string', description: '基于已获得证据整理的笔记正文，不包含虚构信息。' }
      },
      required: ['title', 'content'],
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
    risk: contract.risk
  }))
}

export function getRuntimeToolContract(name: RuntimeToolName) {
  return toolContracts[name]
}

export async function executeRuntimeTool(input: {
  callId: string
  name: RuntimeToolName
  arguments: Record<string, unknown>
  permissions: string[]
  actorId?: string
  idempotencyKey?: string
  saveLearningNote?: (input: {
    actorId: string
    idempotencyKey: string
    title: string
    content: string
  }) => Promise<SavedLearningNote>
}): Promise<RuntimeToolObservation> {
  const startedAt = Date.now()
  const contract = toolContracts[input.name]
  const call = { callId: input.callId, name: input.name, arguments: input.arguments }

  if (!input.permissions.includes(contract.permission)) {
    return {
      ...call,
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
        ...call,
        ok: true,
        permission: contract.permission,
        durationMs: Date.now() - startedAt,
        output: { query: args.query, count: items.length, items }
      }
    }

    if (input.name === 'inspect_project_evidence') {
      const args = inspectProjectInputSchema.parse(input.arguments)
      const project = getProjectBySlug(args.slug)
      if (!project) throw new Error(`未找到项目：${args.slug}`)
      return {
        ...call,
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
    }

    const args = saveLearningNoteInputSchema.parse(input.arguments)
    if (!input.actorId || !input.idempotencyKey || !input.saveLearningNote) throw new Error('学习笔记写入仓储尚未配置')
    const note = await input.saveLearningNote({
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      title: args.title,
      content: args.content
    })
    return {
      ...call,
      ok: true,
      permission: contract.permission,
      durationMs: Date.now() - startedAt,
      output: note
    }
  } catch (error) {
    return {
      ...call,
      ok: false,
      permission: contract.permission,
      durationMs: Date.now() - startedAt,
      output: null,
      error: error instanceof Error ? error.message : '工具输入或执行失败'
    }
  }
}
