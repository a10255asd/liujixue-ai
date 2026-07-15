import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)
const stringList = z.array(nonEmptyString)

export const contentAuditFieldsSchema = z.object({
  status: z.enum(['draft', 'reviewed', 'published']),
  lastReviewedAt: z.string().date(),
  sourceUpdatedAt: z.string().date().optional(),
  authors: stringList.min(1),
  reviewers: stringList.min(1)
})

export const roadmapStageSchema = z.object({
  slug: nonEmptyString,
  title: nonEmptyString,
  order: z.number().int().positive(),
  level: z.enum(['入门', '进阶', '高级', '求职']),
  summary: nonEmptyString,
  goals: stringList.min(1),
  prerequisites: stringList,
  topics: stringList.min(1),
  outputs: stringList.min(1),
  interviewFocus: stringList.min(1),
  projectRefs: stringList,
  resourceRefs: stringList
}).merge(contentAuditFieldsSchema)

export const knowledgePointSchema = z.object({
  slug: nonEmptyString,
  title: nonEmptyString,
  category: z.enum([
    'ai-basic',
    'llm',
    'prompt',
    'rag',
    'agent',
    'mcp',
    'eval',
    'deploy',
    'security',
    'career'
  ]),
  level: z.enum(['入门', '进阶', '高级']),
  summary: nonEmptyString,
  whyItMatters: nonEmptyString,
  explanation: nonEmptyString,
  engineeringNotes: stringList.min(1),
  example: nonEmptyString,
  commonMistakes: stringList.min(1),
  interviewAnswer: nonEmptyString,
  relatedQuestions: stringList,
  relatedProjects: stringList,
  references: stringList.min(1)
}).merge(contentAuditFieldsSchema)

export const interviewQuestionSchema = z.object({
  id: nonEmptyString,
  question: nonEmptyString,
  category: z.enum([
    'ai-basic',
    'llm-api',
    'prompt-context',
    'rag',
    'agent',
    'mcp',
    'framework',
    'eval-observability',
    'deploy-cost',
    'system-design',
    'coding',
    'behavior',
    'project-review'
  ]),
  level: z.enum(['初级', '中级', '高级']),
  tags: stringList.min(1),
  whatItTests: stringList.min(1),
  shortAnswer: nonEmptyString,
  fullAnswer: nonEmptyString,
  bonusPoints: stringList,
  commonMistakes: stringList.min(1),
  followUps: stringList.min(1),
  projectConnection: nonEmptyString,
  references: stringList.min(1)
}).merge(contentAuditFieldsSchema)

export const practicalProjectSchema = z.object({
  slug: nonEmptyString,
  title: nonEmptyString,
  level: z.enum(['入门', '进阶', '高级']),
  summary: nonEmptyString,
  targetUser: nonEmptyString,
  stack: stringList.min(1),
  features: stringList.min(1),
  architecture: nonEmptyString,
  implementationSteps: stringList.min(1),
  hardParts: stringList.min(1),
  interviewValue: nonEmptyString,
  resumeBullet: nonEmptyString,
  relatedQuestions: stringList,
  demoUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional()
}).merge(contentAuditFieldsSchema)

export const resourceLinkSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  sourceType: z.enum(['official-doc', 'paper', 'example', 'course', 'blog', 'repo']),
  category: nonEmptyString,
  url: z.string().url(),
  summary: nonEmptyString,
  recommendedFor: stringList.min(1),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)])
}).merge(contentAuditFieldsSchema)

export const learningJournalSchema = z.object({
  slug: nonEmptyString,
  title: nonEmptyString,
  date: z.string().date(),
  stage: nonEmptyString,
  learned: stringList.min(1),
  blockers: stringList,
  solved: stringList,
  artifacts: stringList.min(1),
  interviewTakeaways: stringList,
  nextActions: stringList.min(1)
}).merge(contentAuditFieldsSchema)

export const roadmapSchema = z.array(roadmapStageSchema)
export const knowledgeSchema = z.array(knowledgePointSchema)
export const interviewSchema = z.array(interviewQuestionSchema)
export const projectsSchema = z.array(practicalProjectSchema)
export const resourcesSchema = z.array(resourceLinkSchema)
export const journalsSchema = z.array(learningJournalSchema)

export type RoadmapStage = z.infer<typeof roadmapStageSchema>
export type KnowledgePoint = z.infer<typeof knowledgePointSchema>
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>
export type PracticalProject = z.infer<typeof practicalProjectSchema>
export type ResourceLink = z.infer<typeof resourceLinkSchema>
export type LearningJournal = z.infer<typeof learningJournalSchema>
export type ContentAuditFields = z.infer<typeof contentAuditFieldsSchema>
