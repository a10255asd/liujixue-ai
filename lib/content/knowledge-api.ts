import {
  getInterviewQuestionById,
  getInterviewQuestions,
  getKnowledgeBySlug,
  getKnowledgePoints
} from './repository'
import type { InterviewQuestion, KnowledgePoint } from './schemas'

type ApiResponse<T> = {
  success: boolean
  data: T
  message: string | null
}

type ApiSource = {
  sourceType?: string
  title?: string
  url?: string
  publisher?: string
}

type ApiQuestionDetail = {
  questionText?: string
  expectedAnswerMarkdown?: string
  evaluationPoints?: string[]
  followUpQuestions?: string[]
  roles?: string[]
  techTags?: string[]
  answerTimeMinutes?: number
}

type ApiKnowledgeItem = {
  publicId: string
  siteCode: string
  topicCode?: string | null
  contentType: string
  slug: string
  title: string
  summary?: string | null
  bodyMarkdown?: string | null
  difficulty?: string | null
  status: string
  tags?: string[] | null
  sources?: ApiSource[] | null
  questionDetail?: ApiQuestionDetail | null
  updatedAt?: string | null
}

type ApiKnowledgeCollectionItem = {
  itemPublicId: string
  sortOrder: number
  sectionTitle?: string | null
  item?: ApiKnowledgeItem | null
}

type ApiKnowledgeCollection = {
  publicId: string
  siteCode: string
  slug: string
  title: string
  summary?: string | null
  collectionType: string
  status: string
  sortOrder?: number | null
  items?: ApiKnowledgeCollectionItem[] | null
}

export type LearningPathCollectionItem = {
  slug: string
  title: string
  summary: string
  sectionTitle: string
  topicCode: string
  level: KnowledgePoint['level']
  href: string
}

export type LearningPathCollection = {
  publicId: string
  slug: string
  title: string
  summary: string
  itemCount: number
  items: LearningPathCollectionItem[]
}

export type InterviewSetCollectionItem = {
  slug: string
  question: string
  title: string
  summary: string
  sectionTitle: string
  topicCode: string
  level: InterviewQuestion['level']
  href: string
}

export type InterviewSetCollection = {
  publicId: string
  slug: string
  title: string
  summary: string
  itemCount: number
  items: InterviewSetCollectionItem[]
}

const API_BASE_URL =
  process.env.LIUJIXUE_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://mall.liujixue.cn/_liujixue-api'

const SITE_CODE = 'ai'
const REVIEW_DATE = '2026-07-16'
const AUTHORS = ['刘鸡血']
const REVIEWERS = ['刘鸡血']

const knowledgeCategoryByTopic: Record<string, KnowledgePoint['category']> = {
  'llm-basics': 'llm',
  'prompt-engineering': 'prompt',
  rag: 'rag',
  agent: 'agent',
  evaluation: 'eval',
  engineering: 'deploy'
}

const questionCategoryByTopic: Record<string, InterviewQuestion['category']> = {
  'llm-basics': 'llm-api',
  'prompt-engineering': 'prompt-context',
  rag: 'rag',
  agent: 'agent',
  evaluation: 'eval-observability',
  engineering: 'deploy-cost'
}

function apiUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`
}

async function getApiData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(apiUrl(path), {
      next: { revalidate: 300 }
    })
    if (!response.ok) return null
    const json = await response.json() as ApiResponse<T>
    if (!json.success) return null
    return json.data
  } catch {
    return null
  }
}

function uniqueBy<T>(items: T[], keyFor: (item: T) => string): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    const key = keyFor(item)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstParagraph(markdown?: string | null, fallback = ''): string {
  const text = stripMarkdown(markdown ?? '')
  if (!text) return fallback
  return text.length > 220 ? `${text.slice(0, 218)}…` : text
}

function topicToKnowledgeCategory(topicCode?: string | null): KnowledgePoint['category'] {
  return knowledgeCategoryByTopic[topicCode ?? ''] ?? 'ai-basic'
}

function topicToQuestionCategory(topicCode?: string | null): InterviewQuestion['category'] {
  return questionCategoryByTopic[topicCode ?? ''] ?? 'ai-basic'
}

function knowledgeLevel(difficulty?: string | null): KnowledgePoint['level'] {
  if (difficulty === 'advanced' || difficulty === 'expert') return '高级'
  if (difficulty === 'intermediate') return '进阶'
  return '入门'
}

function questionLevel(difficulty?: string | null): InterviewQuestion['level'] {
  if (difficulty === 'advanced' || difficulty === 'expert') return '高级'
  if (difficulty === 'intermediate') return '中级'
  return '初级'
}

function sourceRefs(item: ApiKnowledgeItem): string[] {
  const sources = item.sources?.map((source) => source.title).filter(Boolean) as string[] | undefined
  return sources?.length ? sources : ['liujixue-api-knowledge']
}

function auditFields() {
  return {
    status: 'published' as const,
    lastReviewedAt: REVIEW_DATE,
    authors: AUTHORS,
    reviewers: REVIEWERS
  }
}

function toKnowledgePoint(item: ApiKnowledgeItem): KnowledgePoint {
  const explanation = firstParagraph(item.bodyMarkdown, item.summary ?? item.title)
  return {
    slug: item.slug,
    title: item.title,
    category: topicToKnowledgeCategory(item.topicCode),
    level: knowledgeLevel(item.difficulty),
    summary: item.summary ?? explanation,
    whyItMatters: item.summary ?? '这个知识点会影响 AI 应用的真实工程质量。',
    explanation,
    engineeringNotes: [
      '先把概念落到输入、处理、输出和验证链路里。',
      '用固定样例或日志验证改动效果，避免只凭一次演示判断质量。'
    ],
    example: item.bodyMarkdown ?? item.summary ?? item.title,
    commonMistakes: [
      '只背术语，不说明工程取舍。',
      '忽略评测、日志、成本和失败边界。'
    ],
    interviewAnswer: item.summary ?? explanation,
    relatedQuestions: [],
    relatedProjects: [],
    references: sourceRefs(item),
    ...auditFields()
  }
}

function toInterviewQuestion(item: ApiKnowledgeItem): InterviewQuestion {
  const detail = item.questionDetail
  const expected = detail?.expectedAnswerMarkdown ?? item.bodyMarkdown ?? item.summary ?? item.title
  const tags = uniqueBy([...(item.tags ?? []), ...(detail?.techTags ?? [])], (tag) => tag)
  return {
    id: item.slug,
    question: detail?.questionText ?? item.title,
    category: topicToQuestionCategory(item.topicCode),
    level: questionLevel(item.difficulty),
    tags: tags.length ? tags : [item.topicCode ?? 'ai'],
    whatItTests: detail?.evaluationPoints?.length ? detail.evaluationPoints : [item.summary ?? '考察 AI 工程取舍和表达结构。'],
    shortAnswer: firstParagraph(expected, item.summary ?? item.title),
    fullAnswer: expected,
    bonusPoints: detail?.roles?.length ? detail.roles.map((role) => `能结合 ${role} 的真实工作场景回答。`) : [],
    commonMistakes: [
      '只给概念定义，没有说明工程场景。',
      '没有提到验证、监控或失败处理。'
    ],
    followUps: detail?.followUpQuestions?.length ? detail.followUpQuestions : ['你会如何用项目证据证明自己做过这件事？'],
    projectConnection: '回答时尽量连接到一个可运行项目、评测记录、日志或复盘材料。',
    references: sourceRefs(item),
    ...auditFields()
  }
}

function toLearningPathCollection(collection: ApiKnowledgeCollection): LearningPathCollection {
  const items = (collection.items ?? [])
    .filter((entry): entry is ApiKnowledgeCollectionItem & { item: ApiKnowledgeItem } =>
      Boolean(entry.item && entry.item.status === 'published' && entry.item.contentType === 'article')
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => ({
      slug: entry.item.slug,
      title: entry.item.title,
      summary: entry.item.summary ?? firstParagraph(entry.item.bodyMarkdown, entry.item.title),
      sectionTitle: entry.sectionTitle ?? entry.item.title,
      topicCode: entry.item.topicCode ?? 'ai',
      level: knowledgeLevel(entry.item.difficulty),
      href: `/knowledge/${entry.item.slug}`
    }))

  return {
    publicId: collection.publicId,
    slug: collection.slug,
    title: collection.title,
    summary: collection.summary ?? '',
    itemCount: items.length,
    items
  }
}

function toInterviewSetCollection(collection: ApiKnowledgeCollection): InterviewSetCollection {
  const items = (collection.items ?? [])
    .filter((entry): entry is ApiKnowledgeCollectionItem & { item: ApiKnowledgeItem } =>
      Boolean(entry.item && entry.item.status === 'published' && entry.item.contentType === 'interview_question')
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => {
      const detail = entry.item.questionDetail
      return {
        slug: entry.item.slug,
        question: detail?.questionText ?? entry.item.title,
        title: entry.item.title,
        summary: entry.item.summary ?? firstParagraph(entry.item.bodyMarkdown, entry.item.title),
        sectionTitle: entry.sectionTitle ?? entry.item.title,
        topicCode: entry.item.topicCode ?? 'ai',
        level: questionLevel(entry.item.difficulty),
        href: `/interview/${entry.item.slug}`
      }
    })

  return {
    publicId: collection.publicId,
    slug: collection.slug,
    title: collection.title,
    summary: collection.summary ?? '',
    itemCount: items.length,
    items
  }
}

async function getRemoteItems(contentType?: string): Promise<ApiKnowledgeItem[]> {
  const params = new URLSearchParams({
    limit: '100'
  })
  if (contentType) params.set('contentType', contentType)
  return await getApiData<ApiKnowledgeItem[]>(`/api/knowledge/${SITE_CODE}/items?${params}`) ?? []
}

async function getRemoteInterviewQuestions(): Promise<ApiKnowledgeItem[]> {
  return await getApiData<ApiKnowledgeItem[]>(`/api/knowledge/${SITE_CODE}/interview-questions?limit=100`) ?? []
}

async function getRemoteItem(slug: string): Promise<ApiKnowledgeItem | null> {
  return await getApiData<ApiKnowledgeItem>(`/api/knowledge/${SITE_CODE}/items/${encodeURIComponent(slug)}`)
}

async function getRemoteInterviewQuestion(slug: string): Promise<ApiKnowledgeItem | null> {
  return await getApiData<ApiKnowledgeItem>(`/api/knowledge/${SITE_CODE}/interview-questions/${encodeURIComponent(slug)}`)
}

async function getRemoteCollections(collectionType?: string): Promise<ApiKnowledgeCollection[]> {
  const params = new URLSearchParams({
    limit: '20'
  })
  if (collectionType) params.set('collectionType', collectionType)
  return await getApiData<ApiKnowledgeCollection[]>(`/api/knowledge/${SITE_CODE}/collections?${params}`) ?? []
}

async function getRemoteCollection(slug: string): Promise<ApiKnowledgeCollection | null> {
  return await getApiData<ApiKnowledgeCollection>(`/api/knowledge/${SITE_CODE}/collections/${encodeURIComponent(slug)}`)
}

export async function getKnowledgePointsWithApi(): Promise<KnowledgePoint[]> {
  const remote = (await getRemoteItems('article')).map(toKnowledgePoint)
  return uniqueBy([...remote, ...getKnowledgePoints()], (item) => item.slug)
}

export async function getKnowledgeBySlugWithApi(slug: string): Promise<KnowledgePoint | null> {
  const remote = await getRemoteItem(slug)
  if (remote?.contentType === 'article') return toKnowledgePoint(remote)
  return getKnowledgeBySlug(slug)
}

export async function getInterviewQuestionsWithApi(): Promise<InterviewQuestion[]> {
  const remote = (await getRemoteInterviewQuestions()).map(toInterviewQuestion)
  return uniqueBy([...remote, ...getInterviewQuestions()], (item) => item.id)
}

export async function getInterviewQuestionByIdWithApi(id: string): Promise<InterviewQuestion | null> {
  const remote = await getRemoteInterviewQuestion(id)
  if (remote?.contentType === 'interview_question') return toInterviewQuestion(remote)
  return getInterviewQuestionById(id)
}

export async function getLearningPathCollectionsWithApi(): Promise<LearningPathCollection[]> {
  const summaries = await getRemoteCollections('learning_path')
  const detailed = await Promise.all(summaries.map(async (summary) => await getRemoteCollection(summary.slug) ?? summary))
  return detailed
    .filter((collection) => collection.status === 'published' && collection.collectionType === 'learning_path')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(toLearningPathCollection)
    .filter((collection) => collection.itemCount > 0)
}

export async function getInterviewSetCollectionsWithApi(): Promise<InterviewSetCollection[]> {
  const summaries = await getRemoteCollections('interview_set')
  const detailed = await Promise.all(summaries.map(async (summary) => await getRemoteCollection(summary.slug) ?? summary))
  return detailed
    .filter((collection) => collection.status === 'published' && collection.collectionType === 'interview_set')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(toInterviewSetCollection)
    .filter((collection) => collection.itemCount > 0)
}
