import type { Metadata } from 'next'

import { InterviewCard } from '@/components/content/content-cards'
import { PageHeading } from '@/components/ui/page-heading'
import { getInterviewQuestions } from '@/lib/content/repository'

export const metadata: Metadata = {
  title: 'AI Agent 面试题库',
  description: '带考察点、短答案、完整回答、追问和项目关联的 AI Agent 工程面试题。',
  alternates: { canonical: '/interview' }
}

export default function InterviewPage() {
  const questions = getInterviewQuestions()
  const categoryCount = new Set(questions.map((item) => item.category)).size

  return (
    <div className="page-shell page-view">
      <PageHeading
        eyebrow="INTERVIEW WORKBENCH"
        title="练的不是背诵，是回答结构"
        description="先识别考察点，再给出短答案、工程解释和项目证据，最后准备面试官的连续追问。"
        aside={<div className="heading-stat"><strong>{questions.length}</strong><span>题目</span><strong>{categoryCount}</strong><span>分类</span></div>}
      />
      <div className="catalog-toolbar"><span>概念题</span><span>工程题</span><span>项目追问</span></div>
      <div className="content-grid content-grid--questions">
        {questions.map((item) => <InterviewCard item={item} key={item.id} />)}
      </div>
    </div>
  )
}
