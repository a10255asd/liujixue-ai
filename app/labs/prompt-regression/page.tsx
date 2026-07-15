import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { PromptRegressionLab } from '@/components/labs/prompt-regression-lab'
import { PageHeading } from '@/components/ui/page-heading'
import { getPromptRegressionReports } from '@/lib/labs/prompt-regression'

export const metadata: Metadata = {
  title: 'Prompt 调试与回归台原型',
  description: '用固定响应夹具比较 Prompt 版本的 Schema、业务规则、P95 延迟和估算成本。',
  alternates: { canonical: '/labs/prompt-regression' }
}

export default function PromptRegressionLabPage() {
  const reports = getPromptRegressionReports()

  return (
    <div className="page-shell page-view prompt-lab-page">
      <Link className="back-link" href="/projects/prompt-debugger"><ArrowLeft size={16} /> 返回项目证据页</Link>
      <PageHeading
        eyebrow="RUNNABLE PROTOTYPE"
        title="Prompt 回归，不靠手感"
        description="同一组输入和期望，比较两个 Prompt 版本的结构、业务、延迟和成本。当前使用固定夹具，因此每次运行结果一致，适合验证评估引擎本身。"
        aside={<div className="heading-stat"><strong>{reports.length}</strong><span>Prompt 版本</span><strong>{reports[0]?.samples.length ?? 0}</strong><span>固定样例</span></div>}
      />
      <PromptRegressionLab reports={reports} />
    </div>
  )
}
