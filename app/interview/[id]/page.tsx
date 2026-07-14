import type { Metadata } from 'next'
import { ArrowLeft, CheckCircle2, CornerDownRight, Lightbulb, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getInterviewQuestionById, getInterviewQuestions } from '@/lib/content/repository'

type PageProps = { params: Promise<{ id: string }> }

export function generateStaticParams() {
  return getInterviewQuestions().map((item) => ({ id: item.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const item = getInterviewQuestionById(id)
  if (!item) return {}
  return { title: item.question, description: item.shortAnswer, alternates: { canonical: `/interview/${id}` } }
}

export default async function InterviewDetailPage({ params }: PageProps) {
  const { id } = await params
  const item = getInterviewQuestionById(id)
  if (!item) notFound()

  return (
    <article className="page-shell detail-page interview-detail">
      <Link className="back-link" href="/interview"><ArrowLeft size={16} /> 返回面试题库</Link>
      <header className="detail-header detail-header--question">
        <div className="content-card__meta"><span>{item.category}</span><span>{item.level}</span></div>
        <h1>{item.question}</h1>
        <div className="question-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </header>
      <div className="answer-layout">
        <aside className="answer-outline">
          <span>考察点</span>
          <ol>{item.whatItTests.map((point) => <li key={point}>{point}</li>)}</ol>
        </aside>
        <div className="answer-content">
          <section className="answer-short"><span>30 秒回答</span><p>{item.shortAnswer}</p></section>
          <section><h2>完整回答</h2><p>{item.fullAnswer}</p></section>
          <section><h2><Lightbulb size={19} /> 加分信息</h2><ul className="check-list">{item.bonusPoints.map((point) => <li key={point}><CheckCircle2 size={16} />{point}</li>)}</ul></section>
          <section><h2><TriangleAlert size={19} /> 常见问题</h2><ul className="warning-list">{item.commonMistakes.map((mistake) => <li key={mistake}><TriangleAlert size={16} />{mistake}</li>)}</ul></section>
          <section><h2><CornerDownRight size={19} /> 面试官可能追问</h2><ol className="follow-up-list">{item.followUps.map((question) => <li key={question}>{question}</li>)}</ol></section>
          <section className="project-connection"><span>项目连接</span><p>{item.projectConnection}</p></section>
        </div>
      </div>
    </article>
  )
}
