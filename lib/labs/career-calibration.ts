import {
  getCareerGuide,
  getCareerJdSamples,
  getInterviewQuestionById,
  getProjectBySlug,
  getProjects
} from '@/lib/content/repository'
import type { CareerCapability, CareerJdSample, PracticalProject } from '@/lib/content/schemas'

import { interviewRubric } from './mock-interview-scoring'

export type EvidenceLevel = 'strong' | 'partial' | 'gap'

export type CapabilityEvidence = {
  capabilityId: string
  title: string
  score: number
  level: EvidenceLevel
  projects: Array<{
    slug: string
    title: string
    deliveryStatus: PracticalProject['deliveryStatus']
    demoPath?: string
  }>
  nextAction: string
  nextHref: string
}

export type CareerSignalReport = {
  capabilityId: string
  capabilityTitle: string
  requirement: string
  weight: number
  evidence: CapabilityEvidence
}

export type MockInterviewQuestion = {
  id: string
  capabilityId: string
  capabilityTitle: string
  question: string
  level: string
  whatItTests: string[]
  questionHref: string
  project?: {
    slug: string
    title: string
    deliveryStatus: PracticalProject['deliveryStatus']
    href: string
  }
  evidencePrompt: string
  rubric: typeof interviewRubric
}

export type CareerCalibrationReport = {
  sample: CareerJdSample
  coverageScore: number
  strongSignals: number
  partialSignals: number
  gapSignals: number
  signals: CareerSignalReport[]
  interview: MockInterviewQuestion[]
}

const maturityWeight: Record<PracticalProject['deliveryStatus'], number> = {
  blueprint: 0.15,
  prototype: 0.65,
  verified: 1
}

function evidenceLevel(score: number): EvidenceLevel {
  if (score >= 85) return 'strong'
  if (score >= 50) return 'partial'
  return 'gap'
}

function buildCapabilityEvidence(capability: CareerCapability): CapabilityEvidence {
  const projects = capability.projectRefs.flatMap((slug) => {
    const project = getProjectBySlug(slug)
    return project ? [project] : []
  })
  const sortedWeights = projects.map((project) => maturityWeight[project.deliveryStatus]).sort((a, b) => b - a)
  const rawScore = Math.min(1, (sortedWeights[0] ?? 0) + sortedWeights.slice(1).reduce((sum, weight) => sum + weight * 0.1, 0))
  const score = Math.round(rawScore * 100)
  const level = evidenceLevel(score)
  const runnableProject = projects.find((project) => project.deliveryStatus !== 'blueprint')
  const blueprintProject = projects.find((project) => project.deliveryStatus === 'blueprint')

  return {
    capabilityId: capability.id,
    title: capability.title,
    score,
    level,
    projects: projects.map((project) => ({
      slug: project.slug,
      title: project.title,
      deliveryStatus: project.deliveryStatus,
      demoPath: project.evidence.demoPath
    })),
    nextAction: level === 'strong'
      ? '补真实部署记录和生产数据，评估 verified 门禁。'
      : runnableProject
        ? `把「${runnableProject.title}」从确定性原型推进到真实服务验收。`
        : blueprintProject
          ? `先完成「${blueprintProject.title}」的最小可运行闭环。`
          : '补一个与该能力直接相关的可运行证据。',
    nextHref: runnableProject?.evidence.demoPath ?? (blueprintProject ? `/projects/${blueprintProject.slug}` : '/projects')
  }
}

function pickInterviewQuestions(sample: CareerJdSample, signals: CareerSignalReport[]) {
  const usedQuestionIds = new Set<string>()
  const rankedSignals = [...signals].sort((a, b) =>
    b.weight - a.weight || a.evidence.score - b.evidence.score || a.capabilityId.localeCompare(b.capabilityId)
  )
  const questions: MockInterviewQuestion[] = []

  for (const signal of rankedSignals) {
    if (questions.length >= 5) break
    const capability = getCareerGuide().capabilities.find((item) => item.id === signal.capabilityId)
    if (!capability) continue
    const question = capability.questionRefs
      .map((id) => getInterviewQuestionById(id))
      .find((item) => item && !usedQuestionIds.has(item.id))
    if (!question) continue

    usedQuestionIds.add(question.id)
    const project = capability.projectRefs
      .map((slug) => getProjectBySlug(slug))
      .filter((item): item is PracticalProject => Boolean(item))
      .sort((a, b) => maturityWeight[b.deliveryStatus] - maturityWeight[a.deliveryStatus])[0]

    questions.push({
      id: question.id,
      capabilityId: capability.id,
      capabilityTitle: capability.title,
      question: question.question,
      level: question.level,
      whatItTests: question.whatItTests,
      questionHref: `/interview/${question.id}`,
      project: project ? {
        slug: project.slug,
        title: project.title,
        deliveryStatus: project.deliveryStatus,
        href: project.evidence.demoPath ?? `/projects/${project.slug}`
      } : undefined,
      evidencePrompt: project
        ? `回答时必须说明「${project.title}」目前是 ${project.deliveryStatus}，并引用一个可复算结果。`
        : '回答时必须给出一个可验证的工程证据。',
      rubric: interviewRubric
    })
  }

  return questions
}

function buildReport(sample: CareerJdSample, evidenceByCapability: Map<string, CapabilityEvidence>): CareerCalibrationReport {
  const capabilities = getCareerGuide().capabilities
  const signals = sample.signals.map((signal) => {
    const capability = capabilities.find((item) => item.id === signal.capabilityId)
    const evidence = evidenceByCapability.get(signal.capabilityId)
    if (!capability || !evidence) throw new Error(`Unknown JD capability: ${signal.capabilityId}`)
    return {
      capabilityId: capability.id,
      capabilityTitle: capability.title,
      requirement: signal.requirement,
      weight: signal.weight,
      evidence
    }
  })
  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0)
  const coverageScore = Math.round(
    signals.reduce((sum, signal) => sum + signal.evidence.score * signal.weight, 0) / totalWeight
  )

  return {
    sample,
    coverageScore,
    strongSignals: signals.filter((signal) => signal.evidence.level === 'strong').length,
    partialSignals: signals.filter((signal) => signal.evidence.level === 'partial').length,
    gapSignals: signals.filter((signal) => signal.evidence.level === 'gap').length,
    signals,
    interview: pickInterviewQuestions(sample, signals)
  }
}

export function getCareerCalibrationWorkspace() {
  const capabilities = getCareerGuide().capabilities
  const evidenceByCapability = new Map(
    capabilities.map((capability) => [capability.id, buildCapabilityEvidence(capability)])
  )
  const reports = getCareerJdSamples().map((sample) => buildReport(sample, evidenceByCapability))
  const publishedProjects = getProjects()

  return {
    reports,
    capabilityCount: capabilities.length,
    sourceCount: reports.length,
    prototypeCount: publishedProjects.filter((project) => project.deliveryStatus === 'prototype').length,
    verifiedCount: publishedProjects.filter((project) => project.deliveryStatus === 'verified').length,
    evidence: [...evidenceByCapability.values()]
  }
}
