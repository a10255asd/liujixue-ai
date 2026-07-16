import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { CareerCalibrationWorkspace } from '@/components/career/career-calibration-workspace'
import { PageHeading } from '@/components/ui/page-heading'
import { getCareerCalibrationWorkspace } from '@/lib/labs/career-calibration'

export const metadata: Metadata = {
  title: 'Agent 岗位校准与模拟面试',
  description: '用真实 Agent 工程师 JD 校准作品集证据，并生成可重复评分的五题模拟面试。',
  alternates: { canonical: '/career/calibration' }
}

export default function CareerCalibrationPage() {
  const workspace = getCareerCalibrationWorkspace()

  return (
    <div className="page-shell page-view career-calibration-page">
      <Link className="back-link" href="/career"><ArrowLeft size={16} /> 返回求职路径</Link>
      <PageHeading
        eyebrow="ROLE CALIBRATION WORKSPACE"
        title="别先背一百道题，先证明岗位要的五件事"
        description="选择一份真实公开 JD，把岗位信号映射到现有项目成熟度，再用固定五题检查回答是否包含概念、取舍、项目证据和失败验证。"
        aside={<div className="heading-stat"><strong>{workspace.sourceCount}</strong><span>真实岗位来源</span><strong>{workspace.prototypeCount} / {workspace.verifiedCount}</strong><span>原型 / 已验证</span></div>}
      />
      <CareerCalibrationWorkspace
        capabilityCount={workspace.capabilityCount}
        prototypeCount={workspace.prototypeCount}
        reports={workspace.reports}
        verifiedCount={workspace.verifiedCount}
      />
    </div>
  )
}
