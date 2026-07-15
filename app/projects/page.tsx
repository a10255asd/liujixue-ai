import { Suspense } from 'react'
import type { Metadata } from 'next'

import { ProjectCatalog } from '@/components/filters/catalog-filters'
import { PageHeading } from '@/components/ui/page-heading'
import { getProjects } from '@/lib/content/repository'

export const metadata: Metadata = {
  title: 'AI Agent 项目实战',
  description: '面向求职展示的 AI Agent 项目架构、实现难点、测试、部署与简历表达。',
  alternates: { canonical: '/projects' }
}

export default function ProjectsPage() {
  const projects = getProjects()

  return (
    <div className="page-shell page-view">
      <PageHeading
        eyebrow="ENGINEERING PORTFOLIO"
        title="做能被追问，也经得起追问的项目"
        description="项目不只列功能，还需要讲清架构选择、失败处理、测试方法、部署边界和量化结果。"
        aside={<div className="heading-count"><strong>{projects.length}</strong><span>项目路径</span></div>}
      />
      <Suspense fallback={<div className="catalog-loading">正在加载项目…</div>}>
        <ProjectCatalog items={projects} />
      </Suspense>
    </div>
  )
}
