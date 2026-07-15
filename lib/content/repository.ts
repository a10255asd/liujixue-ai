import careerData from '@/content/career.json'
import interviewData from '@/content/interview-questions.json'
import journalData from '@/content/journals.json'
import knowledgeData from '@/content/knowledge-points.json'
import projectData from '@/content/projects.json'
import resourceData from '@/content/resources.json'
import roadmapData from '@/content/roadmap.json'

import {
  careerGuideSchema,
  interviewSchema,
  journalsSchema,
  knowledgeSchema,
  projectsSchema,
  resourcesSchema,
  roadmapSchema,
  type CareerGuide,
  type InterviewQuestion,
  type KnowledgePoint,
  type LearningJournal,
  type PracticalProject,
  type ResourceLink,
  type RoadmapStage
} from './schemas'

const published = <T extends { status: string }>(items: T[]) =>
  items.filter((item) => item.status === 'published')

const roadmap = published(roadmapSchema.parse(roadmapData)).sort((a, b) => a.order - b.order)
const knowledge = published(knowledgeSchema.parse(knowledgeData))
const questions = published(interviewSchema.parse(interviewData))
const projects = published(projectsSchema.parse(projectData))
const resources = published(resourcesSchema.parse(resourceData)).sort((a, b) => a.priority - b.priority)
const journals = journalsSchema
  .parse(journalData)
  .filter((item) => item.status === 'published')
  .sort((a, b) => b.date.localeCompare(a.date))
const careerGuide = careerGuideSchema.parse(careerData)

export function getRoadmapStages(): RoadmapStage[] {
  return roadmap
}

export function getKnowledgePoints(): KnowledgePoint[] {
  return knowledge
}

export function getKnowledgeBySlug(slug: string): KnowledgePoint | null {
  return knowledge.find((item) => item.slug === slug) ?? null
}

export function getInterviewQuestions(): InterviewQuestion[] {
  return questions
}

export function getInterviewQuestionById(id: string): InterviewQuestion | null {
  return questions.find((item) => item.id === id) ?? null
}

export function getProjects(): PracticalProject[] {
  return projects
}

export function getProjectBySlug(slug: string): PracticalProject | null {
  return projects.find((item) => item.slug === slug) ?? null
}

export function getResources(): ResourceLink[] {
  return resources
}

export function getJournals(): LearningJournal[] {
  return journals
}

export function getCareerGuide(): CareerGuide {
  return careerGuide
}
