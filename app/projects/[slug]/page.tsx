import type { Metadata } from 'next'
import { ArrowLeft, ArrowUpRight, Check, ClipboardCheck, GitBranch, Layers3, MessageSquareQuote, Quote, Rocket, TestTube2 } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getQuestionsForProject } from '@/lib/content/relations'
import { getProjectDeliveryLabel } from '@/lib/content/labels'
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
        <div className="content-card__meta"><span>PROJECT</span><span>{item.level}</span><span className={`delivery-badge delivery-badge--${item.deliveryStatus}`}>{getProjectDeliveryLabel(item.deliveryStatus)}</span></div>
        <h1>{item.title}</h1><p>{item.summary}</p>
        <div className="stack-list">{item.stack.map((stack) => <span key={stack}>{stack}</span>)}</div>
      </header>

      <section className="project-spec-grid">
        <div><span>目标用户</span><p>{item.targetUser}</p></div>
        <div><span>面试价值</span><p>{item.interviewValue}</p></div>
      </section>

      <section className={`project-proof project-proof--${item.deliveryStatus}`}>
        <div>
          <span>当前交付状态</span>
          <h2>{getProjectDeliveryLabel(item.deliveryStatus)}</h2>
          <p>{item.evidence.summary}</p>
        </div>
        <div className="project-proof__evidence">
          <div><small>验证命令</small>{item.evidence.commands.length ? item.evidence.commands.map((command) => <code key={command}>{command}</code>) : <p>尚无可执行命令</p>}</div>
          <div><small>验证产物</small>{item.evidence.artifacts.length ? <ul>{item.evidence.artifacts.map((artifact) => <li key={artifact}>{artifact}</li>)}</ul> : <p>尚无测试或部署产物</p>}</div>
        </div>
        {item.evidence.demoPath || item.evidence.repositoryUrl ? (
          <div className="project-proof__actions">
            {item.evidence.demoPath ? <Link className="button button--primary" href={item.evidence.demoPath}>运行原型 <ArrowUpRight size={16} /></Link> : null}
            {item.evidence.repositoryUrl ? <a className="button button--secondary" href={item.evidence.repositoryUrl} target="_blank" rel="noreferrer">查看代码 <ArrowUpRight size={16} /></a> : null}
          </div>
        ) : null}
      </section>

      <div className="project-detail__body">
        <section><div className="detail-section-title"><Layers3 size={19} /><h2>{item.deliveryStatus === 'verified' ? '核心架构' : '目标架构'}</h2></div><p>{item.architecture}</p></section>
        <section><div className="detail-section-title"><GitBranch size={19} /><h2>{item.deliveryStatus === 'verified' ? '实现步骤' : '目标实现步骤'}</h2></div><ol className="implementation-list">{item.implementationSteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}</ol></section>
        <section className="project-split"><div><h2>{item.deliveryStatus === 'verified' ? '核心功能' : '目标功能'}</h2><ul className="check-list">{item.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul></div><div><h2>{item.deliveryStatus === 'verified' ? '技术难点' : '预期难点'}</h2><ul className="check-list">{item.hardParts.map((part) => <li key={part}><Check size={16} />{part}</li>)}</ul></div></section>
        <section>
          <div className="detail-section-title"><ClipboardCheck size={19} /><h2>交付与验收</h2></div>
          <div className="project-delivery-grid">
            <div className="project-delivery-block"><TestTube2 size={18} /><h3>测试策略</h3><ol>{item.testStrategy.map((step) => <li key={step}>{step}</li>)}</ol></div>
            <div className="project-delivery-block"><Rocket size={18} /><h3>部署步骤</h3><ol>{item.deploymentPlan.map((step) => <li key={step}>{step}</li>)}</ol></div>
            <div className="project-delivery-block"><ClipboardCheck size={18} /><h3>验收清单</h3><ul>{item.acceptanceChecklist.map((step) => <li key={step}>{step}</li>)}</ul></div>
            <div className="project-delivery-block"><MessageSquareQuote size={18} /><h3>3 分钟讲解</h3><ol>{item.pitchOutline.map((step) => <li key={step}>{step}</li>)}</ol></div>
          </div>
        </section>
        <section className="resume-bullet"><Quote size={20} /><div><span>{item.deliveryStatus === 'verified' ? '简历表达' : '目标简历表达 · 完成验收后使用'}</span><p>{item.resumeBullet}</p></div></section>
        {questions.length ? <section><h2>相关面试题</h2><div className="related-links">{questions.map((question) => <Link href={`/interview/${question.id}`} key={question.id}>{question.question}</Link>)}</div></section> : null}
      </div>
    </article>
  )
}
