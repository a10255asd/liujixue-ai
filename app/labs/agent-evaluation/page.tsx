import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { AgentEvaluationLab } from '@/components/labs/agent-evaluation-lab'
import { PageHeading } from '@/components/ui/page-heading'
import { agentScenarios } from '@/lib/labs/controlled-agent'

export const metadata: Metadata = {
  title: 'Agent 评估与发布门禁原型',
  description: '用固定轨迹比较 Agent 策略版本，按结果、轨迹、权限、预算和副作用定位回归并执行发布门禁。',
  alternates: { canonical: '/labs/agent-evaluation' }
}

export default function AgentEvaluationLabPage() {
  return (
    <div className="page-shell page-view agent-eval-page">
      <Link className="back-link" href="/projects/agent-evaluation-console"><ArrowLeft size={16} /> 返回项目证据页</Link>
      <PageHeading
        eyebrow="AGENT EVALUATION PROTOTYPE"
        title="平均分过关，也不代表能发布"
        description="复用同一组 Agent 执行目标，对比两个控制策略。结果、轨迹、权限、预算和副作用逐项验收，关键安全失败不会被综合分数抵消。"
        aside={<div className="heading-stat"><strong>2</strong><span>策略版本</span><strong>{agentScenarios.length} × 5</strong><span>样本与维度</span></div>}
      />
      <AgentEvaluationLab />
    </div>
  )
}
