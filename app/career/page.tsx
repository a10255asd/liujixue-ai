import type { Metadata } from 'next'
import { ArrowRight, BriefcaseBusiness, CalendarRange, CheckCircle2, ScanSearch } from 'lucide-react'
import Link from 'next/link'

import { CareerAssessment } from '@/components/career/career-assessment'
import { PageHeading } from '@/components/ui/page-heading'
import { SectionHeading } from '@/components/ui/section-heading'
import { getCareerCapabilityEvidence, getCareerWeekEvidence } from '@/lib/content/relations'
import { getCareerGuide, getProjects } from '@/lib/content/repository'

export const metadata: Metadata = {
  title: 'AI Agent 工程师求职路径',
  description: '把岗位要求映射成知识、面试题、项目证据和八周执行计划。',
  alternates: { canonical: '/career' }
}

export default function CareerPage() {
  const guide = getCareerGuide()
  const projects = getProjects()
  const capabilities = guide.capabilities.flatMap((item) => {
    const evidence = getCareerCapabilityEvidence(item.id)
    return evidence ? [evidence] : []
  })
  const weeks = guide.weeks.flatMap((item) => {
    const evidence = getCareerWeekEvidence(item.week)
    return evidence ? [evidence] : []
  })

  return (
    <div className="page-shell page-view career-page">
      <PageHeading
        eyebrow="CAREER OPERATING SYSTEM"
        title="把 JD 变成可验证的能力证据"
        description="不按岗位关键词背术语。每项能力都连接知识、面试题、项目产出和验收标准，最后形成可以演示和被追问的作品集。"
        aside={<div className="heading-stat"><strong>{capabilities.length}</strong><span>能力域</span><strong>{weeks.length}</strong><span>执行周</span></div>}
      />

      <section className="career-calibration-entry">
        <ScanSearch size={22} />
        <div><span>REAL JD CALIBRATION</span><h2>用真实岗位要求检查作品集证据</h2><p>选择公开 Agent 工程师 JD，查看 8 个能力域的覆盖与缺口，并开始一轮固定五题模拟面试。</p></div>
        <Link href="/career/calibration">进入岗位校准 <ArrowRight size={15} /></Link>
      </section>

      <section className="career-section" id="matrix">
        <SectionHeading index="01" title="岗位能力矩阵" description="从招聘描述里识别信号，再准备能被验证的项目证据。" />
        <div className="career-matrix">
          {capabilities.map(({ capability, knowledge, questions, projects: relatedProjects }, index) => (
            <article className="capability-row" key={capability.id}>
              <div className="capability-row__title">
                <span>{String(index + 1).padStart(2, '0')} / {capability.priority}</span>
                <h3>{capability.title}</h3>
                <p>{capability.summary}</p>
              </div>
              <div><small>JD 信号</small><ul>{capability.jdSignals.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><small>证据标准</small><ul>{capability.proofPoints.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div className="capability-links">
                <small>训练入口</small>
                {knowledge.slice(0, 2).map((item) => <Link href={`/knowledge/${item.slug}`} key={item.slug}>{item.title}</Link>)}
                {questions.slice(0, 1).map((item) => <Link href={`/interview/${item.id}`} key={item.id}>{item.question}</Link>)}
                {relatedProjects.slice(0, 1).map((item) => <Link href={`/projects/${item.slug}`} key={item.slug}>{item.title}</Link>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="career-section career-section--assessment" id="assessment">
        <SectionHeading index="02" title="从哪一周开始" description="只勾选你能独立完成并能解释实现细节的项目，不按“听说过”计算。" />
        <CareerAssessment items={guide.assessment} />
      </section>

      <section className="career-section" id="plan">
        <SectionHeading index="03" title="八周执行计划" description="每周都以可运行产出和退出标准结束，避免无限看资料。" />
        <div className="career-weeks">
          {weeks.map(({ week, knowledge, questions, project }) => (
            <article className="career-week" key={week.week}>
              <div className="career-week__number"><span>WEEK</span><strong>{String(week.week).padStart(2, '0')}</strong></div>
              <div className="career-week__focus"><h3>{week.title}</h3><p>{week.focus}</p></div>
              <div><small>本周交付</small><ul>{week.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><small>退出标准</small><ul>{week.exitCriteria.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div className="career-week__links">
                {project ? <Link href={`/projects/${project.slug}`}><BriefcaseBusiness size={15} />{project.title}</Link> : null}
                {knowledge.slice(0, 1).map((item) => <Link href={`/knowledge/${item.slug}`} key={item.slug}><CalendarRange size={15} />{item.title}</Link>)}
                {questions.slice(0, 1).map((item) => <Link href={`/interview/${item.id}`} key={item.id}><CheckCircle2 size={15} />{item.question}</Link>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="career-closing">
        <div><p className="eyebrow">PORTFOLIO GATE</p><h2>不是做完六个项目，<br />而是交付两个完整证据。</h2></div>
        <div><p>优先选择一个 RAG 项目和一个 Agent 项目。通过测试、部署、验收与讲解清单后，再写进简历。</p><Link className="button button--primary" href="/projects">检查 {projects.length} 个项目模板 <ArrowRight size={16} /></Link></div>
      </section>
    </div>
  )
}
