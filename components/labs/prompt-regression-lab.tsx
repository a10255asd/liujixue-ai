'use client'

import { CheckCircle2, CircleX, FlaskConical } from 'lucide-react'
import { useState } from 'react'

import type { PromptRegressionReport } from '@/lib/labs/prompt-regression'

function formatCost(value: number) {
  return `$${value.toFixed(6)}`
}

export function PromptRegressionLab({ reports }: { reports: PromptRegressionReport[] }) {
  const [selectedId, setSelectedId] = useState(reports[0]?.id ?? '')
  const selected = reports.find((report) => report.id === selectedId) ?? reports[0]

  if (!selected) return null

  return (
    <div className="prompt-lab">
      <div className="prompt-lab__notice">
        <FlaskConical size={18} aria-hidden="true" />
        <p><strong>固定夹具模式</strong>：当前原型不发送模型请求，也不需要 API Key。指标来自仓库内固定响应，用于验证回归流程和错误分类。</p>
      </div>

      <div className="prompt-lab__versions" role="tablist" aria-label="Prompt 版本">
        {reports.map((report) => (
          <button
            aria-selected={report.id === selected.id}
            key={report.id}
            onClick={() => setSelectedId(report.id)}
            role="tab"
            type="button"
          >
            <span>{report.name}</span>
            <strong>{report.businessPassRate}%</strong>
            <small>业务通过率</small>
          </button>
        ))}
      </div>

      <section className="prompt-report" role="tabpanel">
        <header className="prompt-report__header">
          <div><p className="eyebrow">SELECTED VERSION</p><h2>{selected.name}</h2><p>{selected.promptSummary}</p></div>
          <div className="prompt-report__metrics">
            <div><small>Schema</small><strong>{selected.schemaPassRate}%</strong></div>
            <div><small>业务规则</small><strong data-testid="business-pass-rate">{selected.businessPassRate}%</strong></div>
            <div><small>P95 延迟</small><strong>{selected.p95LatencyMs}ms</strong></div>
            <div><small>平均成本</small><strong>{formatCost(selected.averageCost)}</strong></div>
          </div>
        </header>

        <div className="prompt-cases">
          {selected.samples.map((sample) => (
            <article className="prompt-case" key={sample.id}>
              <div className="prompt-case__title">
                {sample.businessPass ? <CheckCircle2 size={18} /> : <CircleX size={18} />}
                <div><span>{sample.title}</span><small>{sample.id}</small></div>
              </div>
              <div><small>输入</small><p>{sample.input}</p></div>
              <div><small>期望</small><p>{sample.expected.category} / {sample.expected.priority}</p></div>
              <div><small>实际输出</small><pre>{JSON.stringify(sample.output, null, 2)}</pre></div>
              <div className="prompt-case__result">
                <span className={sample.schemaPass ? 'pass' : 'fail'}>Schema {sample.schemaPass ? '通过' : '失败'}</span>
                <span className={sample.businessPass ? 'pass' : 'fail'}>业务 {sample.businessPass ? '通过' : '失败'}</span>
                <span>{sample.latencyMs}ms</span>
                <span>{formatCost(sample.estimatedCost)}</span>
              </div>
              {sample.issues.length ? <ul>{sample.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
