import {
  getCareerGuide,
  getInterviewQuestionById,
  getInterviewQuestions,
  getKnowledgeBySlug,
  getProjectBySlug,
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

export function getCareerCapabilityEvidence(id: string) {
  const capability = getCareerGuide().capabilities.find((item) => item.id === id)
  if (!capability) return null

  return {
    capability,
    knowledge: capability.knowledgeRefs.flatMap((slug) => {
      const item = getKnowledgeBySlug(slug)
      return item ? [item] : []
    }),
    questions: capability.questionRefs.flatMap((questionId) => {
      const item = getInterviewQuestionById(questionId)
      return item ? [item] : []
    }),
    projects: capability.projectRefs.flatMap((slug) => {
      const item = getProjectBySlug(slug)
      return item ? [item] : []
    })
  }
}

export function getCareerWeekEvidence(weekNumber: number) {
  const week = getCareerGuide().weeks.find((item) => item.week === weekNumber)
  if (!week) return null

  return {
    week,
    knowledge: week.knowledgeRefs.flatMap((slug) => {
      const item = getKnowledgeBySlug(slug)
      return item ? [item] : []
    }),
    questions: week.questionRefs.flatMap((questionId) => {
      const item = getInterviewQuestionById(questionId)
      return item ? [item] : []
    }),
    project: getProjectBySlug(week.projectRef)
  }
}
