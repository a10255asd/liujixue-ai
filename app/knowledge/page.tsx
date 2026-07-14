import type { Metadata } from 'next'

import { KnowledgeCard } from '@/components/content/content-cards'
import { PageHeading } from '@/components/ui/page-heading'
import { getKnowledgePoints } from '@/lib/content/repository'

export const metadata: Metadata = {
  title: 'AI 工程知识库',
  description: '围绕 LLM、Prompt、RAG、Agent、MCP、Eval 和部署的工程知识库。',
  alternates: { canonical: '/knowledge' }
}

export default function KnowledgePage() {
  const knowledge = getKnowledgePoints()

  return (
    <div className="page-shell page-view">
      <PageHeading
        eyebrow="KNOWLEDGE BASE"
        title="知识不是术语表，而是工程决策"
        description="每个知识点都回答：它为什么重要、工程上怎么用、容易错在哪，以及面试时怎样说清楚。"
        aside={<div className="heading-count"><strong>{knowledge.length}</strong><span>首批知识点</span></div>}
      />
      <div className="catalog-toolbar" aria-label="知识库状态">
        <span>全部主题</span><span>按工程链路组织</span><span>持续补充</span>
      </div>
      <div className="content-grid">
        {knowledge.map((item) => <KnowledgeCard item={item} key={item.slug} />)}
      </div>
    </div>
  )
}
