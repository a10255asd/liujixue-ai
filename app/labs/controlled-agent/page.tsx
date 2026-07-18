import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { ControlledAgentLab } from '@/components/labs/controlled-agent-lab'
import { LabRelatedContent } from '@/components/labs/lab-related-content'
import { ServerAgentRuntimeLab } from '@/components/labs/server-agent-runtime-lab'
import labStyles from '@/components/labs/server-agent-runtime-lab.module.css'
import { PageHeading } from '@/components/ui/page-heading'
import { evaluateRuntimePlanner } from '@/lib/agent-runtime/evaluation'

export const metadata: Metadata = {
  title: '受控任务执行 Agent 原型',
  description: '用确定性状态机验证工具权限、步数预算、幂等重试、人工审批和失败轨迹。',
  alternates: { canonical: '/labs/controlled-agent' }
}

export default function ControlledAgentLabPage() {
  const runtimeEvaluation = evaluateRuntimePlanner()

  return (
    <div className="page-shell page-view agent-lab-page">
      <Link className="back-link" href="/projects/task-planning-agent"><ArrowLeft size={16} /> 返回项目证据页</Link>
      <PageHeading
        eyebrow="CONTROLLED AGENT · VERIFIED CANDIDATE"
        title="从控制流原型，走向真实工具运行"
        description="服务端运行时已经能够规划并读取真实知识与项目证据；下方五类固定轨迹继续承担权限、预算、重试和审批的安全回归基线。"
        aside={<div className="heading-stat"><strong>2</strong><span>真实只读工具</span><strong>{runtimeEvaluation.caseCount}</strong><span>契约评测</span></div>}
      />
      <ServerAgentRuntimeLab evaluationCases={runtimeEvaluation.caseCount} evaluationPassRate={runtimeEvaluation.passRate} />
      <section className={labStyles.otelNote} aria-label="OTel 可观测性映射说明">
        <div>
          <p className="eyebrow">OBSERVABILITY · TRACE → OTEL</p>
          <h2>同一条轨迹，换成业界标准语言</h2>
        </div>
        <p>
          运行结束后可导出一份对齐 OpenTelemetry GenAI 语义约定的 span JSON（结构对齐的 resourceSpans/scopeSpans/spans，
          不是完整 OTLP wire format，也不依赖 @opentelemetry/sdk）。映射关系：
        </p>
        <div className={labStyles.otelMap}>
          <div><code>一次运行</code><p>根 span <code>invoke_agent liujixue-controlled-agent</code>；run.status → span status（completed→OK，failed/budget_exceeded→ERROR，waiting_approval/rejected→UNSET）。</p></div>
          <div><code>每个规划轮次</code><p>真实模型模式为 <code>chat &lt;model&gt;</code>（CLIENT），确定性 planner 为 <code>plan</code>（INTERNAL），均带 <code>gen_ai.operation.name</code>。</p></div>
          <div><code>每次工具调用</code><p><code>execute_tool &lt;tool&gt;</code> 子 span：<code>gen_ai.tool.name</code>、<code>gen_ai.tool.call.id</code>、<code>gen_ai.tool.call.arguments/result</code>；守卫、审批等待与审批结果记录为 span event。</p></div>
          <div><code>token 用量</code><p>根 span 的 <code>gen_ai.usage.input_tokens/output_tokens</code>（含 cache_read/cache_creation）；仅真实模型模式输出，夹具模式省略而非伪造。</p></div>
        </div>
        <p>
          为什么生产 agent 需要标准可观测性：属性命名统一后，同一份 span 可以送进 Jaeger、Grafana Tempo、Datadog 等任何
          OTel 后端，跨框架排障与对比，不被单一厂商格式锁定；接生产后端时用官方 SDK 按同一约定重新仪表化即可。
        </p>
      </section>
      <p>
        <Link className="text-link" href="/labs/mcp-tools">在 MCP 协议层观察同一批只读工具（initialize → tools/list → tools/call） <ArrowRight size={16} /></Link>
      </p>
      <ControlledAgentLab />
      <LabRelatedContent lab="controlled-agent" />
    </div>
  )
}
