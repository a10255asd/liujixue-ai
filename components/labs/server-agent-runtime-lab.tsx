'use client'

import { ArrowUpRight, Database, LoaderCircle, Play, Search, ServerCog, ShieldCheck, TerminalSquare } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import type { RuntimeRunResult, RuntimeToolObservation } from '@/lib/agent-runtime/contracts'

const presets = [
  '查找 Agent 工具权限知识',
  '检查 task-planning-agent 项目证据',
  '先查找 Agent 工具权限知识，再检查 task-planning-agent 项目证据'
]

function ObservationResult({ observation }: { observation: RuntimeToolObservation }) {
  if (!observation.ok) return <p className="runtime-observation__error">{observation.error}</p>

  if (observation.name === 'search_knowledge') {
    const output = observation.output as {
      count: number
      items: Array<{ slug: string; title: string; category: string; level: string; summary: string; href: string }>
    }
    return (
      <div className="runtime-search-results">
        {output.items.map((item) => (
          <Link href={item.href} key={item.slug}>
            <span>{item.category} · {item.level}</span>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
            <ArrowUpRight size={14} />
          </Link>
        ))}
        {!output.count ? <p>没有命中足够相关的已发布知识点。</p> : null}
      </div>
    )
  }

  const output = observation.output as {
    slug: string
    title: string
    deliveryStatus: string
    evidenceSummary: string
    commands: string[]
    artifacts: string[]
    href: string
  }
  return (
    <div className="runtime-project-result">
      <div><span>{output.deliveryStatus}</span><strong>{output.title}</strong></div>
      <p>{output.evidenceSummary}</p>
      <dl>
        <div><dt>验证命令</dt><dd>{output.commands.join(' · ')}</dd></div>
        <div><dt>证据产物</dt><dd>{output.artifacts.join(' · ')}</dd></div>
      </dl>
      <Link href={output.href}>打开项目证据 <ArrowUpRight size={14} /></Link>
    </div>
  )
}

export function ServerAgentRuntimeLab({ evaluationCases, evaluationPassRate }: { evaluationCases: number; evaluationPassRate: number }) {
  const [goal, setGoal] = useState(presets[2])
  const [run, setRun] = useState<RuntimeRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function startRun() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      })
      const result = await response.json() as RuntimeRunResult | { error?: string }
      if (!response.ok || !('runId' in result)) throw new Error('error' in result ? result.error : '服务端运行失败。')
      setRun(result)
    } catch (caught) {
      setRun(null)
      setError(caught instanceof Error ? caught.message : '服务端运行失败。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="server-runtime" aria-labelledby="server-runtime-title">
      <header className="server-runtime__header">
        <div>
          <p className="eyebrow">SERVER RUNTIME · CANDIDATE 01</p>
          <h2 id="server-runtime-title">让规划器读取真实证据</h2>
          <p>任务从浏览器发送到服务端，经过规划、严格工具 Schema、权限守卫和工具预算，再返回真实知识与项目证据。</p>
        </div>
        <dl>
          <div><dt>真实只读工具</dt><dd>2</dd></div>
          <div><dt>契约评测</dt><dd>{evaluationCases}</dd></div>
          <div><dt>夹具通过率</dt><dd>{Math.round(evaluationPassRate * 100)}%</dd></div>
        </dl>
      </header>

      <div className="server-runtime__workspace">
        <div className="runtime-composer">
          <div className="runtime-mode-line">
            <span data-testid="runtime-mode"><ServerCog size={15} /> 服务端安全模式</span>
            <small>公开环境默认使用确定性规划器</small>
          </div>
          <label htmlFor="runtime-goal">任务目标</label>
          <textarea
            id="runtime-goal"
            maxLength={500}
            onChange={(event) => setGoal(event.target.value)}
            rows={5}
            value={goal}
          />
          <div className="runtime-presets" aria-label="任务样例">
            {presets.map((preset) => (
              <button aria-pressed={goal === preset} key={preset} onClick={() => setGoal(preset)} type="button">{preset}</button>
            ))}
          </div>
          <button className="button button--primary runtime-run-button" disabled={loading || goal.trim().length < 8} onClick={startRun} type="button">
            {loading ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
            {loading ? '服务端执行中' : '开始受控运行'}
          </button>

          <div className="runtime-guardrails">
            <div><ShieldCheck size={16} /><span>仅开放 <code>knowledge:read</code> 与 <code>projects:read</code></span></div>
            <div><TerminalSquare size={16} /><span>最多 4 个工具步，参数不符合 Schema 时直接失败</span></div>
            <div><Database size={16} /><span>当前运行只随响应返回，尚未接持久化恢复</span></div>
          </div>
        </div>

        <div className="runtime-output" aria-live="polite">
          {!run && !error ? (
            <div className="runtime-empty"><Search size={24} /><p>运行后，这里会显示服务端模式、真实工具结果与逐步轨迹。</p></div>
          ) : null}
          {error ? <div className="runtime-error"><strong>运行失败</strong><p>{error}</p></div> : null}
          {run ? (
            <>
              <header className="runtime-result-head">
                <div><span data-testid="runtime-provider">{run.mode === 'openai' ? 'OPENAI RESPONSES' : 'SERVER FIXTURE'}</span><h3 data-testid="runtime-status">{run.status === 'completed' ? '运行完成' : '运行已停止'}</h3></div>
                <dl>
                  <div><dt>工具步数</dt><dd>{run.stepsUsed}/{run.maxSteps}</dd></div>
                  <div><dt>总 Token</dt><dd>{run.usage.totalTokens}</dd></div>
                </dl>
              </header>
              <p className="runtime-summary" data-testid="runtime-summary">{run.summary}</p>
              <div className="runtime-observations">
                {run.observations.map((observation) => (
                  <article className="runtime-observation" data-testid="runtime-observation" key={observation.callId}>
                    <header><div><code>{observation.name}</code><span>{observation.permission}</span></div><small>{observation.durationMs}ms</small></header>
                    <ObservationResult observation={observation} />
                  </article>
                ))}
              </div>
              <ol className="runtime-trace" data-testid="runtime-server-trace">
                {run.trace.map((event) => (
                  <li key={event.sequence}><span>{String(event.sequence).padStart(2, '0')}</span><div><strong>{event.title}</strong><p>{event.detail}</p></div><time>+{event.elapsedMs}ms</time></li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}
