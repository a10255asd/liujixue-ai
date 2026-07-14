import {
  getInterviewQuestions,
  getKnowledgeBySlug,
  getProjects,
  getRoadmapStages
} from './repository'
import type { InterviewQuestion, PracticalProject, RoadmapStage } from './schemas'

export function getQuestionsForKnowledge(slug: string): InterviewQuestion[] {
  const item = getKnowledgeBySlug(slug)
  if (!item) return []

  const ids = new Set(item.relatedQuestions)
  return getInterviewQuestions().filter((question) => ids.has(question.id))
}

export function getProjectsForKnowledge(slug: string): PracticalProject[] {
  const item = getKnowledgeBySlug(slug)
  if (!item) return []

  const slugs = new Set(item.relatedProjects)
  return getProjects().filter((project) => slugs.has(project.slug))
}

export function getQuestionsForProject(slug: string): InterviewQuestion[] {
  const project = getProjects().find((item) => item.slug === slug)
  if (!project) return []

  const ids = new Set(project.relatedQuestions)
  return getInterviewQuestions().filter((question) => ids.has(question.id))
}

export function getRoadmapDependencies(slug: string): RoadmapStage[] {
  const stages = getRoadmapStages()
  const stage = stages.find((item) => item.slug === slug)
  if (!stage) return []

  const dependencies = new Set(stage.prerequisites)
  return stages.filter((item) => dependencies.has(item.slug))
}
