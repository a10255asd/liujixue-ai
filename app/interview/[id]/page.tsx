import type { Metadata } from 'next'
import { ArrowLeft, CheckCircle2, CornerDownRight, FileText, Lightbulb, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ContentProvenance } from '@/components/content/content-provenance'
import { RichText } from '@/components/content/rich-text'
import { getInterviewQuestionDetailWithApi, getInterviewQuestionsWithApi } from '@/lib/content/knowledge-api'
import { getCategoryLabel } from '@/lib/content/labels'

type PageProps = { params: Promise<{ id: string }> }

export async function generateStaticParams() {
  return (await getInterviewQuestionsWithApi()).map((item) => ({ id: item.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const item = await getInterviewQuestionDetailWithApi(id)
  if (!item) return {}
  return { title: item.question, description: item.shortAnswer, alternates: { canonical: `/interview/${id}` } }
}

export default async function InterviewDetailPage({ params }: PageProps) {
  const { id } = await params
  const item = await getInterviewQuestionDetailWithApi(id)
  if (!item) notFound()
  const api = item.api
  const answerTime = api?.questionDetail?.answerTimeMinutes
  const roles = api?.questionDetail?.roles ?? []

  return (
    <article className="page-shell detail-page interview-detail">
      <Link className="back-link" href="/interview"><ArrowLeft size={16} /> 返回面试题库</Link>
      <header className="detail-header detail-header--question">
        <div className="content-card__meta"><span>{getCategoryLabel(item.category)}</span><span>{item.level}</span></div>
        <h1>{item.question}</h1>
        <div className="question-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        {answerTime || roles.length ? (
          <div className="detail-meta-strip">
            {answerTime ? <span>{answerTime} 分钟回答</span> : null}
            {roles.map((role) => <span key={role}>{role}</span>)}
          </div>
        ) : null}
      </header>
      <div className="answer-layout">
        <aside className="answer-outline">
          <span>考察点</span>
          <ol>{item.whatItTests.map((point) => <li key={point}>{point}</li>)}</ol>
          {api ? (
            <dl className="answer-outline__meta">
              <div><dt>更新</dt><dd>{api.updatedAt?.slice(0, 10) ?? '待补充'}</dd></div>
              <div><dt>主题</dt><dd>{api.topicCode}</dd></div>
              <div><dt>ID</dt><dd>{api.publicId}</dd></div>
            </dl>
          ) : null}
        </aside>
        <div className="answer-content">
          <section className="answer-short"><span>30 秒回答</span><p>{item.shortAnswer}</p></section>
          {api?.bodyMarkdown ? <section><h2><FileText size={19} /> 题目背景</h2><RichText content={api.bodyMarkdown} /></section> : null}
          <section><h2>完整回答</h2><RichText content={item.fullAnswer} /></section>
          <section><h2><Lightbulb size={19} /> 加分信息</h2><ul className="check-list">{item.bonusPoints.map((point) => <li key={point}><CheckCircle2 size={16} />{point}</li>)}</ul></section>
          <section><h2><TriangleAlert size={19} /> 常见问题</h2><ul className="warning-list">{item.commonMistakes.map((mistake) => <li key={mistake}><TriangleAlert size={16} />{mistake}</li>)}</ul></section>
          <section><h2><CornerDownRight size={19} /> 面试官可能追问</h2><ol className="follow-up-list">{item.followUps.map((question) => <li key={question}>{question}</li>)}</ol></section>
          {api ? <section className="answer-evidence"><ContentProvenance meta={api} title="题目档案" /></section> : null}
          <section className="project-connection"><span>项目连接</span><p>{item.projectConnection}</p></section>
        </div>
      </div>
    </article>
  )
}
