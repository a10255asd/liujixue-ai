import type { Metadata } from 'next'
import { ArrowRight, CheckCircle2, CircleDot, PackageCheck } from 'lucide-react'

import { PageHeading } from '@/components/ui/page-heading'
import { getJournals, getRoadmapStages } from '@/lib/content/repository'

export const metadata: Metadata = {
  title: 'AI 学习日志',
  description: '记录 AI Agent 学习中的问题、解决过程、工程产出和下一步行动。',
  alternates: { canonical: '/journal' }
}

export default function JournalPage() {
  const journals = getJournals()
  const stages = new Map(getRoadmapStages().map((stage) => [stage.slug, stage.title]))

  return (
    <div className="page-shell page-view">
      <PageHeading
        eyebrow="BUILD LOG"
        title="把学习过程变成可复盘的证据"
        description="日志只记录真实问题、解决路径和产出。它既服务下一阶段学习，也服务项目讲解和面试复盘。"
      />
      <div className="journal-list">
        {journals.map((journal) => (
          <article className="journal-entry" key={journal.slug}>
            <div className="journal-entry__date"><strong>{journal.date}</strong><span>{stages.get(journal.stage)}</span></div>
            <div className="journal-entry__body">
              <h2>{journal.title}</h2>
              <div className="journal-entry__grid">
                <div><h3><CircleDot size={16} /> 遇到的问题</h3><p>{journal.blockers[0]}</p></div>
                <ArrowRight className="journal-entry__arrow" size={18} />
                <div><h3><CheckCircle2 size={16} /> 解决方式</h3><p>{journal.solved[0]}</p></div>
                <ArrowRight className="journal-entry__arrow" size={18} />
                <div><h3><PackageCheck size={16} /> 本次产出</h3><p>{journal.artifacts.join('、')}</p></div>
              </div>
              <div className="journal-entry__next"><span>下一步</span>{journal.nextActions.map((action) => <strong key={action}>{action}</strong>)}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
