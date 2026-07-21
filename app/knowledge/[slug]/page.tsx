import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, Check, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ContentProvenance } from '@/components/content/content-provenance'
import { RichText } from '@/components/content/rich-text'
import { getKnowledgeDetailWithApi, getKnowledgePointsWithApi } from '@/lib/content/knowledge-api'
import { getCategoryLabel } from '@/lib/content/labels'
import { getQuestionsForKnowledge, getProjectsForKnowledge } from '@/lib/content/relations'

type PageProps = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return (await getKnowledgePointsWithApi()).map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const item = await getKnowledgeDetailWithApi(slug)
  if (!item) return {}
  return { title: item.title, description: item.summary, alternates: { canonical: `/knowledge/${slug}` } }
}

export default async function KnowledgeDetailPage({ params }: PageProps) {
  const { slug } = await params
  const item = await getKnowledgeDetailWithApi(slug)
  if (!item) notFound()
  const questions = getQuestionsForKnowledge(slug)
  const projects = getProjectsForKnowledge(slug)
  const api = item.api

  return (
    <article className="page-shell detail-page">
      <Link className="back-link" href="/knowledge"><ArrowLeft size={16} /> 返回知识库</Link>
      <header className="detail-header">
        <div className="content-card__meta"><span>{getCategoryLabel(item.category)}</span><span>{item.level}</span></div>
        <h1>{item.title}</h1><p>{item.summary}</p>
        {api?.tags.length ? <div className="question-tags detail-tags">{api.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
      </header>
      <div className="detail-layout">
        <div className="detail-content">
          <section><span className="detail-index">01</span><h2>为什么重要</h2><p>{item.whyItMatters}</p></section>
          <section><span className="detail-index">02</span><h2>核心原理</h2><p>{item.explanation}</p></section>
          <section><span className="detail-index">03</span><h2>工程实现</h2><ul className="check-list">{item.engineeringNotes.map((note) => <li key={note}><Check size={16} />{note}</li>)}</ul></section>
          <section><span className="detail-index">04</span><h2>展开说明</h2><RichText content={item.example} /></section>
          <section><span className="detail-index">05</span><h2>常见误区</h2><ul className="warning-list">{item.commonMistakes.map((mistake) => <li key={mistake}><TriangleAlert size={16} />{mistake}</li>)}</ul></section>
          <section><span className="detail-index">06</span><h2>面试怎么说</h2><blockquote>{item.interviewAnswer}</blockquote></section>
        </div>
        <aside className="detail-aside">
          {api ? <ContentProvenance meta={api} /> : null}
          <div><span>关联面试题</span>{questions.length ? questions.map((question) => <Link href={`/interview/${question.id}`} key={question.id}>{question.question}<ArrowRight size={14} /></Link>) : <p>关联题目待补充</p>}</div>
          <div><span>关联项目</span>{projects.length ? projects.map((project) => <Link href={`/projects/${project.slug}`} key={project.slug}>{project.title}<ArrowRight size={14} /></Link>) : <p>关联项目待补充</p>}</div>
        </aside>
      </div>
    </article>
  )
}
