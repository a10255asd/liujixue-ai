'use client'

import { ArrowUpRight, Check, Database, Download, FilePenLine, LoaderCircle, Play, Search, ServerCog, ShieldCheck, TerminalSquare, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { RuntimeRunResult, RuntimeToolObservation } from '@/lib/agent-runtime/contracts'

import styles from './server-agent-runtime-lab.module.css'

const presets = [
  '查找 Agent 工具权限知识',
  '检查 task-planning-agent 项目证据',
  '先查找 Agent 工具权限知识，再检查 task-planning-agent 项目证据'
]

const writePreset = '查找 Agent 工具权限知识，并保存成学习笔记'

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

  if (observation.name === 'save_learning_note') {
    const output = observation.output as { id: string; title: string; content: string; created: boolean }
    return (
      <div className={styles.noteResult}>
        <span>{output.created ? '已写入' : '幂等命中'}</span>
        <strong>{output.title}</strong>
        <p>{output.content}</p>
        <small>记录 ID · {output.id}</small>
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
  const [pendingRunId, setPendingRunId] = useState<string | null>(null)
  const [writeToolsEnabled, setWriteToolsEnabled] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const persistenceLabel = run?.persistence === 'redis-24h'
    ? 'Redis 保存 24 小时，可按 runId 回放'
    : run?.persistence === 'ephemeral-memory'
      ? '开发进程内临时回放'
      : '仅保留在本次响应中'

  useEffect(() => {
    setPendingRunId(window.localStorage.getItem('agent-runtime-pending-run'))
    fetch('/api/agent/run', { cache: 'no-store' })
      .then((response) => response.json())
      .then((capability: { writeToolsEnabled?: boolean }) => setWriteToolsEnabled(Boolean(capability.writeToolsEnabled)))
      .catch(() => setWriteToolsEnabled(false))
  }, [])

  async function execute(body: { goal: string; runId: string } | { resumeRunId: string } | { approvalRunId: string; decision: 'approve' | 'reject' }) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const result = await response.json() as RuntimeRunResult | { error?: string }
      if (!response.ok || !('runId' in result)) throw new Error('error' in result ? result.error : '服务端运行失败。')
      setRun(result)
      if (result.status === 'waiting_approval') {
        setPendingRunId(result.runId)
        window.localStorage.setItem('agent-runtime-pending-run', result.runId)
      } else {
        setPendingRunId(null)
        window.localStorage.removeItem('agent-runtime-pending-run')
      }
    } catch (caught) {
      setRun(null)
      setError(caught instanceof Error ? caught.message : '服务端运行失败。')
    } finally {
      setLoading(false)
    }
  }

  async function startRun() {
    const runId = window.crypto.randomUUID()
    setPendingRunId(runId)
    window.localStorage.setItem('agent-runtime-pending-run', runId)
    await execute({ goal, runId })
  }

  async function resumeRun() {
    if (!pendingRunId) return
    try {
      const replayResponse = await fetch(`/api/agent/run?id=${pendingRunId}`, { cache: 'no-store' })
      if (replayResponse.ok) {
        const record = await replayResponse.json() as { run: RuntimeRunResult }
        setRun(record.run)
        setError(null)
        setPendingRunId(null)
        window.localStorage.removeItem('agent-runtime-pending-run')
        return
      }
    } catch {
      // A missing completed record can still have a resumable running checkpoint.
    }
    await execute({ resumeRunId: pendingRunId })
  }

  async function resolveApproval(decision: 'approve' | 'reject') {
    if (!run?.pendingApproval) return
    await execute({ approvalRunId: run.runId, decision })
  }

  async function exportOtelTrace() {
    if (!run || exporting) return
    setExporting(true)
    setExportError(null)
    try {
      const response = await fetch(`/api/agent/run?id=${run.runId}&format=otel`, { cache: 'no-store' })
      const payload = await response.json() as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'OTel 导出失败。')
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `agent-run-${run.runId}.otel.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : 'OTel 导出失败。')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="server-runtime" aria-labelledby="server-runtime-title">
      <header className="server-runtime__header">
        <div>
          <p className="eyebrow">SERVER RUNTIME · CANDIDATE 02</p>
          <h2 id="server-runtime-title">让每一步都可验证、可恢复</h2>
          <p>任务在服务端逐轮规划；每个工具结果经过 Schema、权限和预算守卫，并在可用仓储中写入版本化检查点。</p>
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
            {[...presets, ...(writeToolsEnabled ? [writePreset] : [])].map((preset) => (
              <button aria-pressed={goal === preset} key={preset} onClick={() => setGoal(preset)} type="button">{preset}</button>
            ))}
          </div>
          <button className="button button--primary runtime-run-button" disabled={loading || goal.trim().length < 8} onClick={startRun} type="button">
            {loading ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
            {loading ? '服务端执行中' : '开始受控运行'}
          </button>
          {pendingRunId && error ? (
            <button className="button runtime-run-button" disabled={loading} onClick={resumeRun} type="button">从服务端检查点恢复</button>
          ) : null}

          {run?.status === 'waiting_approval' && run.pendingApproval ? (
            <div className={styles.approval} data-testid="runtime-approval">
              <div className={styles.approvalIcon}><FilePenLine size={18} /></div>
              <div className={styles.approvalCopy}>
                <span>WRITE APPROVAL</span>
                <strong>{run.pendingApproval.title}</strong>
                <p>{run.pendingApproval.detail}</p>
                <code>{run.pendingApproval.permission}</code>
              </div>
              <div className={styles.approvalActions}>
                <button aria-label="拒绝写入" disabled={loading} onClick={() => resolveApproval('reject')} type="button"><X size={16} />拒绝</button>
                <button aria-label="批准写入" disabled={loading} onClick={() => resolveApproval('approve')} type="button"><Check size={16} />批准一次</button>
              </div>
            </div>
          ) : null}

          <div className="runtime-guardrails">
            <div><ShieldCheck size={16} /><span>{writeToolsEnabled ? '读取默认放行，写入必须逐次审批' : '当前仅开放知识与项目证据读取'}</span></div>
            <div><TerminalSquare size={16} /><span>最多 4 个工具步，参数不符合 Schema 时直接失败</span></div>
            <div data-testid="runtime-persistence"><Database size={16} /><span>{run ? persistenceLabel : '仓储能力由服务端环境决定，页面不预设持久化'}</span></div>
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
                <div><span data-testid="runtime-provider">{run.mode === 'openai' ? 'OPENAI RESPONSES' : 'SERVER FIXTURE'}</span><h3 data-testid="runtime-status">{run.status === 'completed' ? '运行完成' : run.status === 'waiting_approval' ? '等待审批' : run.status === 'rejected' ? '写入已拒绝' : '运行已停止'}</h3></div>
                <dl>
                  <div><dt>工具步数</dt><dd>{run.stepsUsed}/{run.maxSteps}</dd></div>
                  <div><dt>{run.rateLimit ? '本窗口余量' : '总 Token'}</dt><dd>{run.rateLimit ? run.rateLimit.remaining : run.usage.totalTokens}</dd></div>
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
              <div className={styles.traceToolbar}>
                <span>运行轨迹 · {run.trace.length} 条事件</span>
                {run.persistence === 'response-only' ? (
                  <small>仅响应模式不保留运行记录，启用仓储后可导出 OTel JSON</small>
                ) : (
                  <button disabled={exporting} onClick={exportOtelTrace} type="button">
                    {exporting ? <LoaderCircle className="spin" size={14} /> : <Download size={14} />}
                    {exporting ? '导出中' : '导出 OTel JSON'}
                  </button>
                )}
              </div>
              {exportError ? <p className={styles.traceExportError}>{exportError}</p> : null}
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
