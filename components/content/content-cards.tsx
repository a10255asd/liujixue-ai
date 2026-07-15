import { ArrowRight, Layers3 } from 'lucide-react'
import Link from 'next/link'

import type { InterviewQuestion, KnowledgePoint, PracticalProject } from '@/lib/content/schemas'
import { getCategoryLabel, getProjectDeliveryLabel } from '@/lib/content/labels'

export function KnowledgeCard({ item }: { item: KnowledgePoint }) {
  return (
    <article className="content-card content-card--knowledge">
      <div className="content-card__meta">
        <span>{getCategoryLabel(item.category)}</span>
        <span>{item.level}</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      <Link className="text-link" href={`/knowledge/${item.slug}`}>
        阅读知识点 <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  )
}

export function InterviewCard({ item }: { item: InterviewQuestion }) {
  return (
    <article className="content-card content-card--question">
      <div className="content-card__meta">
        <span>{getCategoryLabel(item.category)}</span>
        <span>{item.level}</span>
      </div>
      <h3>{item.question}</h3>
      <ul className="compact-list">
        {item.whatItTests.slice(0, 2).map((point) => <li key={point}>{point}</li>)}
      </ul>
      <Link className="text-link" href={`/interview/${item.id}`}>
        组织回答 <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  )
}

export function ProjectCard({ item }: { item: PracticalProject }) {
  return (
    <article className="project-card">
      <div className="project-card__topline">
        <span className="project-card__icon"><Layers3 size={18} aria-hidden="true" /></span>
        <div className="project-card__status">
          <span className={`delivery-badge delivery-badge--${item.deliveryStatus}`}>{getProjectDeliveryLabel(item.deliveryStatus)}</span>
          <span>{item.level}</span>
        </div>
      </div>
      <div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
      </div>
      <div className="stack-list" aria-label="技术栈">
        {item.stack.slice(0, 4).map((stack) => <span key={stack}>{stack}</span>)}
      </div>
      <Link className="text-link" href={`/projects/${item.slug}`}>
        {item.deliveryStatus === 'blueprint' ? '查看项目方案' : '查看运行证据'} <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  )
}
