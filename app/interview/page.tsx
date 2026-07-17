import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ArrowRight, BrainCircuit, MessageSquareText } from 'lucide-react'
import Link from 'next/link'

import { InterviewCatalog } from '@/components/filters/catalog-filters'
import { PageHeading } from '@/components/ui/page-heading'
import { SectionHeading } from '@/components/ui/section-heading'
import { getInterviewQuestionsWithApi, getInterviewSetCollectionsWithApi } from '@/lib/content/knowledge-api'

export const metadata: Metadata = {
  title: 'AI Agent 面试题库',
  description: '带考察点、短答案、完整回答、追问和项目关联的 AI Agent 工程面试题。',
  alternates: { canonical: '/interview' }
}

export default async function InterviewPage() {
  const [questions, interviewSets] = await Promise.all([
    getInterviewQuestionsWithApi(),
    getInterviewSetCollectionsWithApi()
  ])
  const categoryCount = new Set(questions.map((item) => item.category)).size

  return (
    <div className="page-shell page-view">
      <PageHeading
        eyebrow="INTERVIEW WORKBENCH"
        title="练的不是背诵，是回答结构"
        description="先识别考察点，再给出短答案、工程解释和项目证据，最后准备面试官的连续追问。"
        aside={<div className="heading-stat"><strong>{questions.length}</strong><span>题目</span><strong>{categoryCount}</strong><span>分类</span></div>}
      />

      {interviewSets.length ? (
        <section className="interview-sets" aria-label="服务器面试题组">
          <SectionHeading
            index="SETS"
            title="服务器面试题组"
            description="从后端内容库同步的主题化训练题组，先按场景练回答结构，再进入完整题库查漏补缺。"
            action={<Link className="text-link" href="/knowledge">补知识点 <ArrowRight size={16} /></Link>}
          />
          <div className="interview-set-grid">
            {interviewSets.map((set) => (
              <article className="interview-set" key={set.slug}>
                <div className="interview-set__summary">
                  <div className="interview-set__badge"><BrainCircuit size={18} aria-hidden="true" /><span>{set.itemCount} 道题</span></div>
                  <h2>{set.title}</h2>
                  <p>{set.summary}</p>
                </div>
                <ol className="interview-set__questions">
                  {set.items.map((item, index) => (
                    <li key={item.slug}>
                      <span className="interview-set__index">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <span className="interview-set__meta">{item.sectionTitle} / {item.level}</span>
                        <Link href={item.href}>{item.question}</Link>
                        <p>{item.summary}</p>
                      </div>
                      <MessageSquareText size={17} aria-hidden="true" />
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <Suspense fallback={<div className="catalog-loading">正在加载题库…</div>}>
        <InterviewCatalog items={questions} />
      </Suspense>
    </div>
  )
}
