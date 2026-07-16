import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { ControlledAgentLab } from '@/components/labs/controlled-agent-lab'
import { PageHeading } from '@/components/ui/page-heading'
import { agentScenarios } from '@/lib/labs/controlled-agent'

export const metadata: Metadata = {
  title: '受控任务执行 Agent 原型',
  description: '用确定性状态机验证工具权限、步数预算、幂等重试、人工审批和失败轨迹。',
  alternates: { canonical: '/labs/controlled-agent' }
}

export default function ControlledAgentLabPage() {
  return (
    <div className="page-shell page-view agent-lab-page">
      <Link className="back-link" href="/projects/task-planning-agent"><ArrowLeft size={16} /> 返回项目证据页</Link>
      <PageHeading
        eyebrow="CONTROLLED AGENT PROTOTYPE"
        title="每一步，都在控制边界内"
        description="把计划、工具调用、观察、重试、审批和终止写成显式状态机。五类固定轨迹让越权、重复副作用和无限循环都能被自动验证。"
        aside={<div className="heading-stat"><strong>{agentScenarios.length}</strong><span>固定执行场景</span><strong>100%</strong><span>预算门禁通过</span></div>}
      />
      <ControlledAgentLab />
    </div>
  )
}
