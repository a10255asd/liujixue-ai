import type { Metadata } from 'next'
import { ArrowDown, Box, Braces, Eye, ShieldCheck, Wrench } from 'lucide-react'
import Link from 'next/link'

import { PageHeading } from '@/components/ui/page-heading'
import { getInterviewQuestions, getKnowledgePoints, getProjects } from '@/lib/content/repository'

export const metadata: Metadata = {
  title: 'Agent 工程专题',
  description: '从模型决策、工具调用、状态、循环控制到评估和权限边界的 Agent 工程专题。',
  alternates: { canonical: '/agent' }
}

const architecture = [
  { icon: Braces, index: '01', title: '模型决策', text: '理解目标与当前状态，选择回答、工具或停止。' },
  { icon: Wrench, index: '02', title: '受控工具', text: '以明确输入、输出和权限执行真实世界动作。' },
  { icon: Box, index: '03', title: '状态循环', text: '保存观察结果，控制重试、最大步数与终止条件。' },
  { icon: Eye, index: '04', title: '追踪评估', text: '记录每一步决策，用样例和指标判断是否可靠。' },
  { icon: ShieldCheck, index: '05', title: '安全边界', text: '高风险动作需要最小权限、输入校验和人工确认。' }
]

export default function AgentPage() {
  const knowledge = getKnowledgePoints().filter((item) => ['agent', 'mcp', 'eval', 'security'].includes(item.category))
  const questions = getInterviewQuestions().filter((item) => ['agent', 'mcp', 'eval-observability'].includes(item.category))
  const projects = getProjects().filter((item) => item.stack.some((stack) => stack.includes('Agent') || stack === 'MCP'))

  return (
    <div className="page-shell page-view">
      <PageHeading
        eyebrow="AGENT ENGINEERING"
        title="Agent 是一套受控执行系统"
        description="模型只是决策核心。真正决定可靠性的，是工具契约、状态控制、终止条件、可观测性和人工确认。"
        aside={<div className="agent-seal"><span>MODEL</span><strong>+</strong><span>TOOLS</span><strong>+</strong><span>STATE</span></div>}
      />

      <section className="agent-flow" aria-labelledby="agent-flow-title">
        <div className="agent-flow__intro"><span>核心链路</span><h2 id="agent-flow-title">一次 Agent 执行发生了什么</h2></div>
        <div className="agent-flow__steps">
          {architecture.map((item, index) => {
            const Icon = item.icon
            return (
              <div className="agent-step" key={item.title}>
                <div className="agent-step__icon"><Icon size={19} aria-hidden="true" /></div>
                <span>{item.index}</span><h3>{item.title}</h3><p>{item.text}</p>
                {index < architecture.length - 1 ? <ArrowDown className="agent-step__arrow" size={17} aria-hidden="true" /> : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="agent-index">
        <div className="agent-index__column">
          <span className="eyebrow">KNOWLEDGE</span><h2>核心知识</h2>
          {knowledge.length ? knowledge.map((item) => (
            <Link className="index-row" href={`/knowledge/${item.slug}`} key={item.slug}><strong>{item.title}</strong><span>{item.level}</span></Link>
          )) : <p className="muted-copy">Agent 专题知识正在按路线补充，先从 Agent Loop 开始。</p>}
          <Link className="text-link" href="/knowledge/agent-loop">阅读 Agent Loop</Link>
        </div>
        <div className="agent-index__column">
          <span className="eyebrow">INTERVIEW</span><h2>高频追问</h2>
          {questions.map((item) => (
            <Link className="index-row" href={`/interview/${item.id}`} key={item.id}><strong>{item.question}</strong><span>{item.level}</span></Link>
          ))}
        </div>
        <div className="agent-index__column">
          <span className="eyebrow">PROJECTS</span><h2>工程验证</h2>
          {projects.map((item) => (
            <Link className="index-row" href={`/projects/${item.slug}`} key={item.slug}><strong>{item.title}</strong><span>{item.level}</span></Link>
          ))}
        </div>
      </section>
    </div>
  )
}
