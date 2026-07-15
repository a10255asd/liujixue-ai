import type { MetadataRoute } from 'next'

import { getInterviewQuestions, getKnowledgePoints, getProjects } from '@/lib/content/repository'
import { siteConfig } from '@/lib/site-config'

export default function sitemap(): MetadataRoute.Sitemap {
  const updatedAt = new Date('2026-07-15')
  const routes = ['', '/roadmap', '/knowledge', '/agent', '/career', '/interview', '/projects', '/resources', '/journal']

  return [
    ...routes.map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: updatedAt })),
    ...getKnowledgePoints().map((item) => ({ url: `${siteConfig.url}/knowledge/${item.slug}`, lastModified: updatedAt })),
    ...getInterviewQuestions().map((item) => ({ url: `${siteConfig.url}/interview/${item.id}`, lastModified: updatedAt })),
    ...getProjects().map((item) => ({ url: `${siteConfig.url}/projects/${item.slug}`, lastModified: updatedAt }))
  ]
}
