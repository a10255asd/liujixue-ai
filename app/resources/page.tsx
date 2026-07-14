import type { Metadata } from 'next'
import { ArrowUpRight, BookMarked } from 'lucide-react'

import { PageHeading } from '@/components/ui/page-heading'
import { getResources } from '@/lib/content/repository'

export const metadata: Metadata = {
  title: 'AI 工程资料导航',
  description: '按学习阶段整理的 AI、Agent、MCP 和应用开发官方资料。',
  alternates: { canonical: '/resources' }
}

export default function ResourcesPage() {
  const resources = getResources()

  return (
    <div className="page-shell page-view">
      <PageHeading
        eyebrow="REFERENCE DESK"
        title="资料要少而准，并且知道何时看"
        description="优先官方文档和可运行示例。每条资料都说明适合哪个阶段，避免把收藏数量误当成学习进度。"
        aside={<div className="heading-count"><strong>{resources.length}</strong><span>精选来源</span></div>}
      />
      <div className="resource-list">
        {resources.map((resource, index) => (
          <a className="resource-row" href={resource.url} target="_blank" rel="noopener noreferrer" key={resource.id}>
            <div className="resource-row__index">{String(index + 1).padStart(2, '0')}</div>
            <div className="resource-row__icon"><BookMarked size={19} aria-hidden="true" /></div>
            <div className="resource-row__main"><span>{resource.sourceType} / {resource.category}</span><h2>{resource.title}</h2><p>{resource.summary}</p></div>
            <div className="resource-row__for"><small>适合</small><span>{resource.recommendedFor.slice(0, 2).join(' · ')}</span></div>
            <ArrowUpRight className="resource-row__arrow" size={18} aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  )
}
