import type { Metadata } from 'next'
import { ArrowRight, Check, Flag, Target } from 'lucide-react'
import Link from 'next/link'

import { PageHeading } from '@/components/ui/page-heading'
import { getProjects, getRoadmapStages } from '@/lib/content/repository'

export const metadata: Metadata = {
  title: 'AI Agent 工程师学习路线',
  description: '从 AI 基础、LLM API、RAG、Agent 到 MCP 和求职工程化的七阶段路线。',
  alternates: { canonical: '/roadmap' }
}

export default function RoadmapPage() {
  const stages = getRoadmapStages()
  const projects = getProjects()

  return (
    <div className="page-shell page-view">
      <PageHeading
        eyebrow="ROADMAP / 7 STAGES"
        title="从 0 到 Agent 工程交付"
        description="每一阶段都有学习目标、工程产出和面试检查点。路线不是阅读顺序，而是一套能力验收协议。"
        aside={<div className="heading-stat"><strong>{stages.length}</strong><span>阶段</span><strong>{projects.length}</strong><span>项目</span></div>}
      />

      <div className="roadmap-rail">
        {stages.map((stage) => (
          <article className="roadmap-stage" id={stage.slug} key={stage.slug}>
            <div className="roadmap-stage__marker">
              <span>{String(stage.order).padStart(2, '0')}</span>
            </div>
            <div className="roadmap-stage__body">
              <div className="roadmap-stage__heading">
                <div><span className="level-label">{stage.level}</span><h2>{stage.title}</h2></div>
                <p>{stage.summary}</p>
              </div>
              <div className="stage-columns">
                <div>
                  <h3><Target size={17} /> 学习目标</h3>
                  <ul>{stage.goals.map((goal) => <li key={goal}><Check size={15} />{goal}</li>)}</ul>
                </div>
                <div>
                  <h3><Flag size={17} /> 阶段产出</h3>
                  <ul>{stage.outputs.map((output) => <li key={output}><Check size={15} />{output}</li>)}</ul>
                </div>
              </div>
              <div className="topic-line">{stage.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>
            </div>
          </article>
        ))}
      </div>

      <div className="next-step-panel">
        <div><span>不知道从哪开始？</span><h2>先建立 AI 工程共同语言。</h2></div>
        <Link className="button button--primary" href="/knowledge/what-is-token">阅读第一个知识点 <ArrowRight size={17} /></Link>
      </div>
    </div>
  )
}
