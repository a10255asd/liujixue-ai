import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { LabRelatedContent } from '@/components/labs/lab-related-content'
import { RagRetrievalLab } from '@/components/labs/rag-retrieval-lab'
import { PageHeading } from '@/components/ui/page-heading'
import { getRagPrototypeData } from '@/lib/labs/rag-retrieval'

export const metadata: Metadata = {
  title: '可评估 RAG 知识库原型',
  description: '用确定性内部手册验证文档摄取、混合检索、引用回答和检索评估闭环。',
  alternates: { canonical: '/labs/rag-retrieval' }
}

export default function RagRetrievalLabPage() {
  const data = getRagPrototypeData()

  return (
    <div className="page-shell page-view rag-lab-page">
      <Link className="back-link" href="/projects/rag-knowledge-base"><ArrowLeft size={16} /> 返回项目证据页</Link>
      <PageHeading
        eyebrow="RUNNABLE RAG PROTOTYPE"
        title="每个回答，都能回到证据"
        description="用小型确定性文档集跑通入库、章节切分、混合检索、引用返回与离线评估。先证明检索链路可测，再讨论向量库和生成模型。"
        aside={<div className="heading-stat"><strong>{data.documents.length}</strong><span>版本化手册</span><strong>{data.evaluationCases.length}</strong><span>固定评估题</span></div>}
      />
      <RagRetrievalLab
        chunkCount={data.chunks.length}
        documentCount={data.documents.length}
        evaluationCases={data.evaluationCases}
        reports={data.reports}
      />
      <LabRelatedContent lab="rag-retrieval" />
    </div>
  )
}
