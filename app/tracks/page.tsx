import type { Metadata } from 'next'

import { TrackWorkspace } from '@/components/tracks/track-workspace'
import { PageHeading } from '@/components/ui/page-heading'
import { getTrainingTrackWorkspace } from '@/lib/content/relations'

export const metadata: Metadata = {
  title: 'AI Agent 实战训练路径',
  description: '三条从知识、任务、项目证据到面试表达的 AI Agent 工程训练路径。',
  alternates: { canonical: '/tracks' }
}

export default function TrainingTracksPage() {
  const tracks = getTrainingTrackWorkspace()
  const taskCount = tracks.reduce((total, track) => total + track.tasks.length, 0)

  return (
    <div className="page-shell page-view tracks-page">
      <PageHeading
        eyebrow="DELIVERY TRACKS"
        title="少看目录，完成三次工程交付"
        description="每条路径只保留完成岗位证据所需的知识、任务和项目。进度保存在当前浏览器，不需要登录。"
        aside={<div className="heading-stat"><strong>{tracks.length}</strong><span>核心路径</span><strong>{taskCount}</strong><span>交付任务</span></div>}
      />
      <TrackWorkspace tracks={tracks} />
    </div>
  )
}
