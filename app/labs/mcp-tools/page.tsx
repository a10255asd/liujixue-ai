import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { LabRelatedContent } from '@/components/labs/lab-related-content'
import { McpToolsLab } from '@/components/labs/mcp-tools-lab'
import labStyles from '@/components/labs/mcp-tools-lab.module.css'
import { PageHeading } from '@/components/ui/page-heading'
import { getProjects } from '@/lib/content/repository'

export const metadata: Metadata = {
  title: 'MCP 工具协议实验',
  description: '亲手发送 initialize、tools/list 与 tools/call 消息，逐帧观察 MCP 的 JSON-RPC 2.0 协议轨迹。',
  alternates: { canonical: '/labs/mcp-tools' }
}

const handshakeSteps = [
  { index: 'STEP 01', method: 'initialize', text: '客户端声明 protocolVersion 与身份信息；server 返回协商后的版本、capabilities 和 serverInfo。' },
  { index: 'STEP 02', method: 'notifications/initialized', text: '客户端确认初始化完成。这是通知：server 返回 202，不应答任何响应体。' },
  { index: 'STEP 03', method: 'tools/list', text: 'server 按 JSON Schema 公布可用工具。client 不需要预先知道工具签名，运行时发现即可。' },
  { index: 'STEP 04', method: 'tools/call', text: '按 name + arguments 调用工具；结果以 content 与 structuredContent 返回，工具级失败用 isError 标记。' }
]

const compareRows = [
  {
    dimension: '本质',
    mcp: '开放协议：client 与 server 之间的 JSON-RPC 2.0 消息标准，本身与模型无关。',
    functionCalling: '模型能力：模型按给定 Schema 输出结构化调用意图，本身与传输无关。'
  },
  {
    dimension: '解决什么',
    mcp: '工具的发现与接入标准化：任何 MCP client 都能连接任何 server，一次集成、处处复用。',
    functionCalling: '让模型决定何时调用、调用哪个工具、参数填什么。'
  },
  {
    dimension: 'Schema 来源',
    mcp: 'server 通过 tools/list 动态公布，client 在运行时拉取。',
    functionCalling: '应用开发者在每次模型请求里静态提供。'
  },
  {
    dimension: '运行边界',
    mcp: '工具跑在独立 server，可跨语言、跨机器、独立控权与独立发布。',
    functionCalling: '工具通常在应用进程内执行，延迟最低、类型闭环最强。'
  },
  {
    dimension: '本站实例',
    mcp: 'POST /api/mcp（本实验）：5 个协议方法、2 个只读工具。',
    functionCalling: 'POST /api/agent/run + lib/agent-runtime：受控 Agent 实验。'
  }
]

export default function McpToolsLabPage() {
  const projects = getProjects().map((project) => ({ slug: project.slug, title: project.title }))

  return (
    <div className="page-shell page-view">
      <Link className="back-link" href="/projects/task-planning-agent"><ArrowLeft size={16} /> 返回项目证据页</Link>
      <PageHeading
        eyebrow="MCP PROTOCOL · HANDS-ON"
        title="协议不是黑盒：亲手发一遍 MCP 消息"
        description="本页连接一个真实的最小 MCP server（POST /api/mcp）。每次运行都会依次完成 initialize 握手、tools/list 工具发现和 tools/call 调用，并完整展示每一对 JSON-RPC 请求与响应。"
        aside={<div className="heading-stat"><strong>5</strong><span>协议方法</span><strong>2</strong><span>只读工具</span></div>}
      />

      <section className={labStyles.explainer} aria-label="MCP 协议讲解">
        <div className={labStyles.explainerBlock}>
          <div>
            <p className="eyebrow">MESSAGE FLOW</p>
            <h2>一次 MCP 会话的消息时序</h2>
          </div>
          <p>下方实验里的每一次点击都会按这个顺序真实执行；MCP 的 streamable HTTP transport 在单请求模式下就是普通的 POST + JSON。</p>
          <div className={labStyles.handshake}>
            {handshakeSteps.map((step) => (
              <div className={labStyles.handshakeStep} key={step.method}>
                <span>{step.index}</span>
                <code>{step.method}</code>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={labStyles.explainerBlock}>
          <div>
            <p className="eyebrow">PROTOCOL vs MODEL CAPABILITY</p>
            <h2>MCP 是协议层标准化，function calling 是模型能力</h2>
          </div>
          <p>面试高频追问。两者解决不同层的问题，经常一起出现：宿主用 function calling 让模型选择工具，用 MCP 把工具接到模型面前。</p>
          <div className={labStyles.compare}>
            <div className={`${labStyles.compareRow} ${labStyles.compareHead}`}>
              <div>维度</div><div>MCP</div><div>FUNCTION CALLING</div>
            </div>
            {compareRows.map((row) => (
              <div className={labStyles.compareRow} key={row.dimension}>
                <div>{row.dimension}</div>
                <div><p>{row.mcp}</p></div>
                <div><p>{row.functionCalling}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className={labStyles.explainerBlock}>
          <div>
            <p className="eyebrow">WHEN TO USE WHICH</p>
            <h2>工程上怎么选</h2>
          </div>
          <div className={labStyles.choices}>
            <div className={labStyles.choice}>
              <strong>选 MCP</strong>
              <p>工具要被多个宿主（IDE、对话客户端、内部平台）复用；跨语言或跨团队提供工具；需要把权限边界部署在独立服务里；接入第三方工具生态。</p>
              <code>本实验：同一批工具对任何 MCP client 可见</code>
            </div>
            <div className={labStyles.choice}>
              <strong>选 function calling</strong>
              <p>工具是应用私有实现；追求最低延迟与最强类型闭环；工具数量少、变化慢，随应用一起发布即可。</p>
              <code>本站受控 Agent 运行时就是这种模式</code>
            </div>
          </div>
          <p>
            对比实验：<Link className="text-link" href="/labs/controlled-agent">看同一批工具如何被 function calling 运行时调用 <ArrowRight size={16} /></Link>
            {' · '}延伸知识：<Link className="text-link" href="/knowledge/mcp-architecture">MCP Host、Client 与 Server</Link>
            {' · '}<Link className="text-link" href="/knowledge/mcp-primitives">MCP Tools、Resources 与 Prompts</Link>
            {' · '}<Link className="text-link" href="/knowledge/function-calling">函数调用与工具回路</Link>
          </p>
        </div>
      </section>

      <McpToolsLab projects={projects} />
      <LabRelatedContent lab="mcp-tools" />
    </div>
  )
}
