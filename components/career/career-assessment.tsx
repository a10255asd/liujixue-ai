'use client'

import { ArrowRight, Check, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { AssessmentItem } from '@/lib/content/schemas'

export function CareerAssessment({ items }: { items: AssessmentItem[] }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set())

  const result = useMemo(() => {
    const completed = items.filter((item) => checked.has(item.id)).length
    const firstGap = items.find((item) => !checked.has(item.id))
    const percent = Math.round((completed / items.length) * 100)
    return { completed, firstGap, percent }
  }, [checked, items])

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="career-assessment">
      <div className="assessment-list">
        {items.map((item, index) => {
          const selected = checked.has(item.id)
          return (
            <label className="assessment-item" key={item.id}>
              <input aria-label={item.statement} checked={selected} onChange={() => toggle(item.id)} type="checkbox" />
              <span className="assessment-item__check" aria-hidden="true">{selected ? <Check size={15} /> : null}</span>
              <span className="assessment-item__index">{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.statement}</strong>
              <small>对应第 {item.week} 周</small>
            </label>
          )
        })}
      </div>

      <aside className="assessment-result" aria-live="polite">
        <p className="eyebrow">CURRENT BASELINE</p>
        <div className="assessment-score"><strong data-testid="assessment-score">{result.percent}</strong><span>/ 100</span></div>
        <p>已确认 {result.completed} / {items.length} 项能力。</p>
        {result.firstGap ? (
          <div className="assessment-next" data-testid="assessment-next">
            <span>建议从第 {result.firstGap.week} 周开始</span>
            <strong>{result.firstGap.statement}</strong>
            <Link className="text-link" href={result.firstGap.actionHref}>
              {result.firstGap.actionLabel} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="assessment-next">
            <span>基础能力已覆盖</span>
            <strong>进入项目验收与模拟面试</strong>
            <Link className="text-link" href="/projects">检查项目证据 <ArrowRight size={15} /></Link>
          </div>
        )}
        <button className="assessment-reset" onClick={() => setChecked(new Set())} type="button">
          <RotateCcw size={15} aria-hidden="true" /> 重置自测
        </button>
      </aside>
    </div>
  )
}
