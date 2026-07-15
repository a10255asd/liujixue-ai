import type { Metadata } from 'next'
import { ArrowLeft, Check, ClipboardCheck, GitBranch, Layers3, MessageSquareQuote, Quote, Rocket, TestTube2 } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getQuestionsForProject } from '@/lib/content/relations'
import { getProjectBySlug, getProjects } from '@/lib/content/repository'

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getProjects().map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const item = getProjectBySlug(slug)
  if (!item) return {}
  return { title: item.title, description: item.summary, alternates: { canonical: `/projects/${slug}` } }
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params
  const item = getProjectBySlug(slug)
  if (!item) notFound()
  const questions = getQuestionsForProject(slug)

  return (
    <article className="page-shell detail-page project-detail">
      <Link className="back-link" href="/projects"><ArrowLeft size={16} /> 返回项目实战</Link>
      <header className="detail-header project-detail__header">
        <div className="content-card__meta"><span>PROJECT</span><span>{item.level}</span></div>
        <h1>{item.title}</h1><p>{item.summary}</p>
        <div className="stack-list">{item.stack.map((stack) => <span key={stack}>{stack}</span>)}</div>
      </header>

      <section className="project-spec-grid">
        <div><span>目标用户</span><p>{item.targetUser}</p></div>
        <div><span>面试价值</span><p>{item.interviewValue}</p></div>
      </section>

      <div className="project-detail__body">
        <section><div className="detail-section-title"><Layers3 size={19} /><h2>核心架构</h2></div><p>{item.architecture}</p></section>
        <section><div className="detail-section-title"><GitBranch size={19} /><h2>实现步骤</h2></div><ol className="implementation-list">{item.implementationSteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}</ol></section>
        <section className="project-split"><div><h2>核心功能</h2><ul className="check-list">{item.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul></div><div><h2>技术难点</h2><ul className="check-list">{item.hardParts.map((part) => <li key={part}><Check size={16} />{part}</li>)}</ul></div></section>
        <section>
          <div className="detail-section-title"><ClipboardCheck size={19} /><h2>交付与验收</h2></div>
          <div className="project-delivery-grid">
            <div className="project-delivery-block"><TestTube2 size={18} /><h3>测试策略</h3><ol>{item.testStrategy.map((step) => <li key={step}>{step}</li>)}</ol></div>
            <div className="project-delivery-block"><Rocket size={18} /><h3>部署步骤</h3><ol>{item.deploymentPlan.map((step) => <li key={step}>{step}</li>)}</ol></div>
            <div className="project-delivery-block"><ClipboardCheck size={18} /><h3>验收清单</h3><ul>{item.acceptanceChecklist.map((step) => <li key={step}>{step}</li>)}</ul></div>
            <div className="project-delivery-block"><MessageSquareQuote size={18} /><h3>3 分钟讲解</h3><ol>{item.pitchOutline.map((step) => <li key={step}>{step}</li>)}</ol></div>
          </div>
        </section>
        <section className="resume-bullet"><Quote size={20} /><div><span>简历表达</span><p>{item.resumeBullet}</p></div></section>
        {questions.length ? <section><h2>相关面试题</h2><div className="related-links">{questions.map((question) => <Link href={`/interview/${question.id}`} key={question.id}>{question.question}</Link>)}</div></section> : null}
      </div>
    </article>
  )
}
