import {
  getCareerGuide,
  getCareerJdSamples,
  getInterviewQuestions,
  getJournals,
  getKnowledgePoints,
  getProjects,
  getResources,
  getRoadmapStages,
  getTrainingTracks
} from '../lib/content/repository'
import evaluationReportData from '../content/labs/rag-evaluation-report.json'
import { ragDocuments, ragEvaluationCases, ingestRagDocuments } from '../lib/labs/rag-documents'
import { computeRagDocumentsHash, computeRagEvaluationHash } from '../lib/labs/rag-vector-hash'
import { ragVectorStore, validateRagVectorStoreCoverage } from '../lib/labs/rag-vectors'
import { diffEvaluationSnapshot, getRagPrototypeData, ragEvaluationSnapshotSchema } from '../lib/labs/rag-retrieval'

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
const career = getCareerGuide()
const careerJdSamples = getCareerJdSamples()
const trainingTracks = getTrainingTracks()

assertUnique(roadmap.map((item) => item.slug), '路线 slug')
assertUnique(roadmap.map((item) => String(item.order)), '路线 order')
assertUnique(knowledge.map((item) => item.slug), '知识点 slug')
assertUnique(questions.map((item) => item.id), '面试题 id')
assertUnique(projects.map((item) => item.slug), '项目 slug')
assertUnique(resources.map((item) => item.id), '资料 id')
assertUnique(journals.map((item) => item.slug), '日志 slug')
assertUnique(career.capabilities.map((item) => item.id), '求职能力 id')
assertUnique(career.weeks.map((item) => String(item.week)), '求职周次')
assertUnique(career.assessment.map((item) => item.id), '自测 id')
assertUnique(careerJdSamples.map((item) => item.id), '岗位样本 id')
assertUnique(trainingTracks.map((item) => item.slug), '训练路径 slug')
assertUnique(trainingTracks.map((item) => String(item.order)), '训练路径 order')

const roadmapIds = new Set(roadmap.map((item) => item.slug))
const questionIds = new Set(questions.map((item) => item.id))
const projectIds = new Set(projects.map((item) => item.slug))
const resourceIds = new Set(resources.map((item) => item.id))
const knowledgeIds = new Set(knowledge.map((item) => item.slug))

for (const stage of roadmap) {
  assertReferences(`路线 ${stage.slug}`, stage.prerequisites, roadmapIds, '前置路线')
  assertReferences(`路线 ${stage.slug}`, stage.projectRefs, projectIds, '项目')
  assertReferences(`路线 ${stage.slug}`, stage.resourceRefs, resourceIds, '资料')
  assertReferences(`路线 ${stage.slug}`, stage.knowledgeRefs ?? [], knowledgeIds, '知识点')
  assertReferences(`路线 ${stage.slug}`, stage.questionRefs ?? [], questionIds, '面试题')
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

const capabilityIds = new Set(career.capabilities.map((item) => item.id))

for (const capability of career.capabilities) {
  assertReferences(`求职能力 ${capability.id}`, capability.knowledgeRefs, knowledgeIds, '知识点')
  assertReferences(`求职能力 ${capability.id}`, capability.questionRefs, questionIds, '面试题')
  assertReferences(`求职能力 ${capability.id}`, capability.projectRefs, projectIds, '项目')
}

for (const week of career.weeks) {
  assertReferences(`第 ${week.week} 周`, week.knowledgeRefs, knowledgeIds, '知识点')
  assertReferences(`第 ${week.week} 周`, week.questionRefs, questionIds, '面试题')
  assertReferences(`第 ${week.week} 周`, [week.projectRef], projectIds, '项目')
}

for (const item of career.assessment) {
  assertReferences(`自测 ${item.id}`, [item.capabilityId], capabilityIds, '求职能力')
}

for (const sample of careerJdSamples) {
  assertReferences(`岗位样本 ${sample.id}`, sample.signals.map((signal) => signal.capabilityId), capabilityIds, '求职能力')
}

for (const track of trainingTracks) {
  assertUnique(track.tasks.map((task) => task.id), `训练路径 ${track.slug} 任务 id`)
  for (const task of track.tasks) {
    assertReferences(`训练任务 ${track.slug}/${task.id}`, task.knowledgeRefs, knowledgeIds, '知识点')
    assertReferences(`训练任务 ${track.slug}/${task.id}`, task.questionRefs, questionIds, '面试题')
    assertReferences(`训练任务 ${track.slug}/${task.id}`, task.projectRefs, projectIds, '项目')
  }
}

// ---- RAG 向量库一致性：章节块全覆盖 + 内容 hash 未漂移 + 评估快照未漂移 ----
const ragChunks = ingestRagDocuments(ragDocuments)
const vectorErrors = validateRagVectorStoreCoverage(
  ragVectorStore,
  ragChunks.map((chunk) => chunk.id),
  ragEvaluationCases.map((item) => item.id)
)
if (ragVectorStore.documentsHash !== computeRagDocumentsHash(ragDocuments)) {
  vectorErrors.push('rag-documents.json 内容与 rag-vectors.json 的 documentsHash 不匹配')
}
if (ragVectorStore.evaluationHash !== computeRagEvaluationHash(ragEvaluationCases)) {
  vectorErrors.push('rag-evaluation.json 内容与 rag-vectors.json 的 evaluationHash 不匹配')
}
if (vectorErrors.length) {
  throw new Error(
    `RAG 向量库校验失败：\n${vectorErrors.join('\n')}\n请运行 npm run build:rag-vectors 重新生成 content/labs/rag-vectors.json`
  )
}

const evaluationSnapshot = ragEvaluationSnapshotSchema.parse(evaluationReportData)
const snapshotDrift = diffEvaluationSnapshot(evaluationSnapshot, getRagPrototypeData().reports)
if (snapshotDrift.length) {
  throw new Error(
    `RAG 评估快照校验失败：\n${snapshotDrift.join('\n')}\n请运行 npm run build:rag-evaluation 重新生成 content/labs/rag-evaluation-report.json`
  )
}

console.log(
  `内容校验通过：${roadmap.length} 阶段、${trainingTracks.length} 训练路径、${knowledge.length} 知识点、${questions.length} 面试题、${projects.length} 项目、${resources.length} 资料、${journals.length} 日志、${career.capabilities.length} 求职能力、${careerJdSamples.length} 岗位样本；RAG 向量库 ${ragVectorStore.chunks.length} 块 + ${ragVectorStore.queries.length} 题（${ragVectorStore.model} · ${ragVectorStore.dimensions} 维）一致`
)
