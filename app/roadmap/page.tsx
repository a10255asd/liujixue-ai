import type { Metadata } from 'next'
import { ArrowRight, BookOpenCheck, Check, FileQuestion, Flag, Route, Target } from 'lucide-react'
import Link from 'next/link'

import { PageHeading } from '@/components/ui/page-heading'
import { SectionHeading } from '@/components/ui/section-heading'
import { getLearningPathCollectionsWithApi } from '@/lib/content/knowledge-api'
import { getInterviewQuestions, getKnowledgePoints, getProjects, getRoadmapStages } from '@/lib/content/repository'

export const metadata: Metadata = {
  title: 'AI Agent 工程师学习路线',
  description: '从零基础先导、AI 基础、LLM API、RAG、Agent 到 MCP 和求职工程化的八阶段路线。',
  alternates: { canonical: '/roadmap' }
}

export default async function RoadmapPage() {
  const stages = getRoadmapStages()
  const projects = getProjects()
  const learningPaths = await getLearningPathCollectionsWithApi()
  const knowledgeBySlug = new Map(getKnowledgePoints().map((item) => [item.slug, item]))
  const questionById = new Map(getInterviewQuestions().map((item) => [item.id, item]))

  return (
    <div className="page-shell page-view">
      <PageHeading
        eyebrow="ROADMAP / 8 STAGES"
        title="从 0 到 Agent 工程交付"
        description="每一阶段都有学习目标、工程产出和面试检查点。路线不是阅读顺序，而是一套能力验收协议。完全没有基础时，从第 0 阶段的零基础先导开始。"
        aside={<div className="heading-stat"><strong>{stages.length}</strong><span>阶段</span><strong>{projects.length}</strong><span>项目</span></div>}
      />

      {learningPaths.length ? (
        <section className="server-paths" aria-label="服务器学习路径">
          <SectionHeading
            index="API"
            title="服务器学习路径"
            description="从后端内容库同步的 AI 应用工程入门路径，把知识文章按真实学习顺序串起来。"
            action={<Link className="text-link" href="/knowledge">查看知识库 <ArrowRight size={16} /></Link>}
          />
          <div className="server-path-grid">
            {learningPaths.map((path) => (
              <article className="server-path" key={path.slug}>
                <div className="server-path__summary">
                  <div className="server-path__badge"><Route size={18} aria-hidden="true" /><span>{path.itemCount} 个知识点</span></div>
                  <h2>{path.title}</h2>
                  <p>{path.summary}</p>
                </div>
                <ol className="server-path__steps">
                  {path.items.map((item, index) => (
                    <li key={item.slug}>
                      <span className="server-path__index">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <span className="server-path__meta">{item.sectionTitle} / {item.level}</span>
                        <Link href={item.href}>{item.title}</Link>
                        <p>{item.summary}</p>
                      </div>
                      <BookOpenCheck size={18} aria-hidden="true" />
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
              {(stage.knowledgeRefs?.length ?? 0) > 0 || (stage.questionRefs?.length ?? 0) > 0 ? (
                <div className="stage-refs">
                  {stage.knowledgeRefs?.length ? (
                    <div className="stage-refs__block">
                      <h3><BookOpenCheck size={17} /> 知识点学习顺序</h3>
                      <ol className="stage-refs__list">
                        {stage.knowledgeRefs.map((slug, index) => (
                          <li key={slug}>
                            <span className="stage-refs__index">{String(index + 1).padStart(2, '0')}</span>
                            <Link href={`/knowledge/${slug}`}>{knowledgeBySlug.get(slug)?.title ?? slug}</Link>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  {stage.questionRefs?.length ? (
                    <div className="stage-refs__block">
                      <h3><FileQuestion size={17} /> 自测面试题</h3>
                      <ul className="stage-refs__list">
                        {stage.questionRefs.map((id) => (
                          <li key={id}>
                            <Link href={`/interview/${id}`}>{questionById.get(id)?.question ?? id}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="topic-line">{stage.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>
            </div>
          </article>
        ))}
      </div>

      <div className="next-step-panel">
        <div><span>不知道从哪开始？</span><h2>先建立 AI 工程共同语言。</h2></div>
        <Link className="button button--primary" href="/knowledge/what-is-an-llm">阅读第一个知识点 <ArrowRight size={17} /></Link>
      </div>
    </div>
  )
}
