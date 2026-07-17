import type { MetadataRoute } from 'next'

import { getInterviewQuestionsWithApi, getKnowledgePointsWithApi } from '@/lib/content/knowledge-api'
import { getProjects } from '@/lib/content/repository'
import { siteConfig } from '@/lib/site-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updatedAt = new Date('2026-07-15')
  const routes = ['', '/tracks', '/roadmap', '/knowledge', '/agent', '/career', '/career/calibration', '/interview', '/projects', '/labs/prompt-regression', '/labs/rag-retrieval', '/labs/controlled-agent', '/labs/agent-evaluation', '/resources', '/journal']
  const knowledge = await getKnowledgePointsWithApi()
  const questions = await getInterviewQuestionsWithApi()

  return [
    ...routes.map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: updatedAt })),
    ...knowledge.map((item) => ({ url: `${siteConfig.url}/knowledge/${item.slug}`, lastModified: updatedAt })),
    ...questions.map((item) => ({ url: `${siteConfig.url}/interview/${item.id}`, lastModified: updatedAt })),
    ...getProjects().map((item) => ({ url: `${siteConfig.url}/projects/${item.slug}`, lastModified: updatedAt }))
  ]
}
