import {
  getInterviewQuestions,
  getJournals,
  getKnowledgePoints,
  getProjects,
  getResources,
  getRoadmapStages
} from '../lib/content/repository'

function assertUnique(values: string[], label: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${label} 存在重复值：${value}`)
    seen.add(value)
  }
}

function assertReferences(
  owner: string,
  references: string[],
  targets: Set<string>,
  targetLabel: string
): void {
  for (const reference of references) {
    if (!targets.has(reference)) {
      throw new Error(`${owner} 引用了不存在的${targetLabel}：${reference}`)
    }
  }
}

const roadmap = getRoadmapStages()
const knowledge = getKnowledgePoints()
const questions = getInterviewQuestions()
const projects = getProjects()
const resources = getResources()
const journals = getJournals()

assertUnique(roadmap.map((item) => item.slug), '路线 slug')
assertUnique(roadmap.map((item) => String(item.order)), '路线 order')
assertUnique(knowledge.map((item) => item.slug), '知识点 slug')
assertUnique(questions.map((item) => item.id), '面试题 id')
assertUnique(projects.map((item) => item.slug), '项目 slug')
assertUnique(resources.map((item) => item.id), '资料 id')
assertUnique(journals.map((item) => item.slug), '日志 slug')

const roadmapIds = new Set(roadmap.map((item) => item.slug))
const questionIds = new Set(questions.map((item) => item.id))
const projectIds = new Set(projects.map((item) => item.slug))
const resourceIds = new Set(resources.map((item) => item.id))

for (const stage of roadmap) {
  assertReferences(`路线 ${stage.slug}`, stage.prerequisites, roadmapIds, '前置路线')
  assertReferences(`路线 ${stage.slug}`, stage.projectRefs, projectIds, '项目')
  assertReferences(`路线 ${stage.slug}`, stage.resourceRefs, resourceIds, '资料')
}

for (const item of knowledge) {
  assertReferences(`知识点 ${item.slug}`, item.relatedQuestions, questionIds, '面试题')
  assertReferences(`知识点 ${item.slug}`, item.relatedProjects, projectIds, '项目')
  assertReferences(`知识点 ${item.slug}`, item.references, resourceIds, '资料')
}

for (const question of questions) {
  assertReferences(`面试题 ${question.id}`, question.references, resourceIds, '资料')
}

for (const project of projects) {
  assertReferences(`项目 ${project.slug}`, project.relatedQuestions, questionIds, '面试题')
}

for (const journal of journals) {
  assertReferences(`日志 ${journal.slug}`, [journal.stage], roadmapIds, '路线')
}

console.log(
  `内容校验通过：${roadmap.length} 阶段、${knowledge.length} 知识点、${questions.length} 面试题、${projects.length} 项目、${resources.length} 资料、${journals.length} 日志`
)
