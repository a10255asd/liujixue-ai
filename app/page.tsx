import { ArrowRight, BookOpen, Braces, CheckCircle2, TerminalSquare } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { ProjectCard } from '@/components/content/content-cards'
import { SectionHeading } from '@/components/ui/section-heading'
import {
  getInterviewQuestions,
  getJournals,
  getKnowledgePoints,
  getProjects,
  getRoadmapStages
} from '@/lib/content/repository'

export default function HomePage() {
  const stages = getRoadmapStages()
  const knowledge = getKnowledgePoints()
  const questions = getInterviewQuestions()
  const projects = getProjects()
  const journals = getJournals()

  return (
    <>
      <section className="home-hero">
        <div className="page-shell home-hero__inner">
          <div className="hero-copy">
            <div className="hero-identity">
              <Image src="/images/avatar.jpg" width={52} height={52} alt="刘鸡血头像" priority />
              <div>
                <span>刘鸡血的 AI 工程学习系统</span>
                <small>持续学习 · 项目验证 · 面试表达</small>
              </div>
            </div>
            <p className="eyebrow">AI AGENT ENGINEERING / 2026</p>
            <h1>从会调用模型，<br />到能交付 Agent。</h1>
            <p className="hero-copy__lead">
              一条给后端与全栈开发者的转型路径。知识、项目和面试题互相连接，每学一段都有可验证的工程产出。
            </p>
            <div className="hero-actions">
              <Link className="button button--primary" href="/roadmap">
                开始学习路线 <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="button button--secondary" href="/interview">进入面试题库</Link>
            </div>
          </div>

          <div className="learning-console" aria-label="学习系统概览">
            <div className="learning-console__header">
              <span><TerminalSquare size={17} aria-hidden="true" /> LEARNING.OS</span>
              <span className="status-dot">ACTIVE</span>
            </div>
            <div className="learning-console__focus">
              <small>CURRENT OBJECTIVE</small>
              <strong>Agent 工程能力闭环</strong>
              <p>原理理解、可运行项目、面试表达，三条线同步推进。</p>
            </div>
            <div className="capability-flow" aria-label="能力闭环">
              <div><span>01</span><strong>理解</strong><small>原理与边界</small></div>
              <ArrowRight size={17} aria-hidden="true" />
              <div><span>02</span><strong>构建</strong><small>项目与评估</small></div>
              <ArrowRight size={17} aria-hidden="true" />
              <div><span>03</span><strong>表达</strong><small>面试与复盘</small></div>
            </div>
            <div className="learning-console__metrics">
              <div><strong>{stages.length}</strong><span>学习阶段</span></div>
              <div><strong>{questions.length}</strong><span>首批面试题</span></div>
              <div><strong>{projects.length}</strong><span>实战项目</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section page-shell">
        <SectionHeading
          index="01"
          title="一条可执行的学习路线"
          description="先建立共同语言，再进入 RAG、Agent、MCP 和生产工程。"
          action={<Link className="text-link" href="/roadmap">查看完整路线 <ArrowRight size={16} /></Link>}
        />
        <div className="roadmap-preview">
          {stages.map((stage) => (
            <article className="roadmap-preview__item" key={stage.slug}>
              <div className="roadmap-preview__index">{String(stage.order).padStart(2, '0')}</div>
              <div>
                <span>{stage.level}</span>
                <h3>{stage.title}</h3>
                <p>{stage.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="page-band">
        <div className="page-shell">
          <SectionHeading
            index="02"
            title="知识与面试同步训练"
            description="理解概念后立即练习表达，避免只会看、不知道怎么说。"
          />
          <div className="two-column-feature">
            <div className="feature-panel">
              <div className="feature-panel__header">
                <BookOpen size={20} aria-hidden="true" />
                <div><span>KNOWLEDGE</span><h3>工程知识库</h3></div>
              </div>
              {knowledge.map((item) => (
                <Link className="feature-row" href={`/knowledge/${item.slug}`} key={item.slug}>
                  <span>{item.level}</span>
                  <strong>{item.title}</strong>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ))}
              <Link className="button button--quiet" href="/knowledge">浏览知识地图</Link>
            </div>
            <div className="feature-panel">
              <div className="feature-panel__header">
                <Braces size={20} aria-hidden="true" />
                <div><span>INTERVIEW</span><h3>回答训练场</h3></div>
              </div>
              {questions.slice(0, 3).map((item) => (
                <Link className="feature-row" href={`/interview/${item.id}`} key={item.id}>
                  <span>{item.level}</span>
                  <strong>{item.question}</strong>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ))}
              <Link className="button button--quiet" href="/interview">开始刷题</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section page-shell">
        <SectionHeading
          index="03"
          title="用项目证明能力"
          description="每个项目都连接架构、难点、测试、部署和面试追问。"
          action={<Link className="text-link" href="/projects">全部项目 <ArrowRight size={16} /></Link>}
        />
        <div className="project-grid">
          {projects.slice(0, 3).map((project) => <ProjectCard item={project} key={project.slug} />)}
        </div>
      </section>

      <section className="home-closing page-shell">
        <div className="home-closing__copy">
          <p className="eyebrow">BUILD IN PUBLIC</p>
          <h2>学习不是收藏资料，<br />而是持续产出证据。</h2>
        </div>
        <div className="journal-snapshot">
          <div className="journal-snapshot__top">
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>{journals[0]?.date}</span>
          </div>
          <h3>{journals[0]?.title}</h3>
          <p>{journals[0]?.solved[0]}</p>
          <Link className="text-link" href="/journal">查看学习日志 <ArrowRight size={16} /></Link>
        </div>
      </section>
    </>
  )
}
