import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { ControlledAgentLab } from '@/components/labs/controlled-agent-lab'
import { ServerAgentRuntimeLab } from '@/components/labs/server-agent-runtime-lab'
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
      <ControlledAgentLab />
    </div>
  )
}
