'use client'

import { Check, CheckCircle2, Circle, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import type { TrainingTask, TrainingTrack } from '@/lib/content/schemas'

type ResolvedTask = TrainingTask & {
  knowledge: Array<{ slug: string; title: string }>
  questions: Array<{ id: string; title: string }>
  projects: Array<{ slug: string; title: string }>
}

type ResolvedTrack = Omit<TrainingTrack, 'tasks'> & { tasks: ResolvedTask[] }

const storageKey = 'jixue-ai:training-progress:v1'

export function TrackWorkspace({ tracks }: { tracks: ResolvedTrack[] }) {
  const [activeSlug, setActiveSlug] = useState(tracks[0]?.slug ?? '')
  const [completed, setCompleted] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]')
      if (Array.isArray(saved)) setCompleted(new Set(saved.filter((item) => typeof item === 'string')))
    } catch {
      window.localStorage.removeItem(storageKey)
    }
    const requestedTrack = window.location.hash.slice(1)
    if (tracks.some((track) => track.slug === requestedTrack)) setActiveSlug(requestedTrack)
  }, [tracks])

  const activeTrack = tracks.find((track) => track.slug === activeSlug) ?? tracks[0]
  const progress = useMemo(() => {
    if (!activeTrack) return { complete: 0, total: 0, percent: 0 }
    const complete = activeTrack.tasks.filter((task) => completed.has(`${activeTrack.slug}:${task.id}`)).length
    return { complete, total: activeTrack.tasks.length, percent: Math.round((complete / activeTrack.tasks.length) * 100) }
  }, [activeTrack, completed])

  function updateCompleted(next: Set<string>) {
    setCompleted(next)
    window.localStorage.setItem(storageKey, JSON.stringify([...next]))
  }

  function toggleTask(taskId: string) {
    if (!activeTrack) return
    const key = `${activeTrack.slug}:${taskId}`
    const next = new Set(completed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    updateCompleted(next)
  }

  function resetTrack() {
    if (!activeTrack) return
    const prefix = `${activeTrack.slug}:`
    updateCompleted(new Set([...completed].filter((key) => !key.startsWith(prefix))))
  }

  function selectTrack(slug: string) {
    setActiveSlug(slug)
    window.history.replaceState(null, '', `#${slug}`)
  }

  if (!activeTrack) return null

  return (
    <div className="track-workspace">
      <div className="track-tabs" role="tablist" aria-label="训练路径">
        {tracks.map((track) => (
          <button
            aria-selected={track.slug === activeTrack.slug}
            className="track-tab"
            key={track.slug}
            onClick={() => selectTrack(track.slug)}
            role="tab"
            type="button"
          >
            <span>{String(track.order).padStart(2, '0')}</span>
            <strong>{track.title}</strong>
            <small>{track.durationWeeks} 周</small>
          </button>
        ))}
      </div>

      <section className="track-panel" role="tabpanel">
        <header className="track-panel__header">
          <div>
            <p className="eyebrow">{activeTrack.kicker}</p>
            <h2>{activeTrack.title}</h2>
            <p>{activeTrack.summary}</p>
          </div>
          <div className="track-progress" aria-label={`已完成 ${progress.complete} / ${progress.total} 项任务`}>
            <div><strong data-testid="track-progress">{progress.percent}</strong><span>%</span></div>
            <small>{progress.complete} / {progress.total} 项任务</small>
            <button onClick={resetTrack} type="button"><RotateCcw size={14} />重置本路径</button>
          </div>
        </header>

        <div className="track-brief">
          <div><small>适合谁</small><p>{activeTrack.forWho}</p></div>
          <div><small>开始前</small><ul>{activeTrack.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><small>最终产出</small><ul>{activeTrack.outcomes.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>

        <div className="track-tasks">
          {activeTrack.tasks.map((task, index) => {
            const checked = completed.has(`${activeTrack.slug}:${task.id}`)
            return (
              <article className={`track-task ${checked ? 'track-task--complete' : ''}`} key={task.id}>
                <label className="track-task__check">
                  <input checked={checked} onChange={() => toggleTask(task.id)} type="checkbox" />
                  <span aria-hidden="true">{checked ? <Check size={17} /> : <Circle size={17} />}</span>
                  <small>{checked ? '已完成' : '待交付'}</small>
                </label>
                <div className="track-task__main">
                  <span>任务 {String(index + 1).padStart(2, '0')}</span>
                  <h3>{task.title}</h3>
                  <p>{task.goal}</p>
                  <div className="track-task__deliverable"><strong>必须交付</strong><p>{task.deliverable}</p></div>
                </div>
                <div className="track-task__evidence">
                  <small>完成证据</small>
                  <ul>{task.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div className="track-task__links">
                  <small>训练材料</small>
                  {task.knowledge.map((item) => <Link href={`/knowledge/${item.slug}`} key={item.slug}>知识 · {item.title}</Link>)}
                  {task.questions.map((item) => <Link href={`/interview/${item.id}`} key={item.id}>面试 · {item.title}</Link>)}
                  {task.projects.map((item) => <Link href={`/projects/${item.slug}`} key={item.slug}>项目 · {item.title}</Link>)}
                </div>
              </article>
            )
          })}
        </div>

        <div className="track-gate">
          <div>
            <p className="eyebrow">ACCEPTANCE GATE</p>
            <h3>全部满足，才算完成这条路径</h3>
            <ul>{activeTrack.acceptanceChecklist.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul>
          </div>
          <aside>
            <small>面试讲解题</small>
            <blockquote>{activeTrack.pitchPrompt}</blockquote>
          </aside>
        </div>
      </section>
    </div>
  )
}
