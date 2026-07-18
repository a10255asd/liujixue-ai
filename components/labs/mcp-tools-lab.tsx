'use client'

import { ArrowUpRight, Braces, LoaderCircle, Play, Search, ServerCog, ShieldCheck, TerminalSquare } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import styles from './mcp-tools-lab.module.css'

type McpToolName = 'search_knowledge' | 'inspect_project_evidence'

type TraceDirection = 'request' | 'response' | 'notification'

type TraceEntry = {
  key: string
  direction: TraceDirection
  method: string
  summary: string
  payload: unknown
  status?: number
  durationMs?: number
  hasError?: boolean
}

type JsonRpcBody = {
  jsonrpc: '2.0'
  id: string | number | null
  result?: {
    content?: Array<{ type: string; text: string }>
    structuredContent?: unknown
    isError?: boolean
    tools?: unknown[]
    protocolVersion?: string
  }
  error?: { code: number; message: string; data?: unknown }
}

type ToolOutcome =
  | { ok: true; name: McpToolName; output: unknown }
  | { ok: false; name: McpToolName; errorText: string }

type ProjectOption = { slug: string; title: string }

const presets: Array<{ label: string; tool: McpToolName; query: string; limit: number; slug: string }> = [
  { label: '检索知识：MCP 与 function calling', tool: 'search_knowledge', query: 'MCP function calling 区别', limit: 3, slug: 'task-planning-agent' },
  { label: '检索知识：Agent 工具权限设计', tool: 'search_knowledge', query: 'Agent 工具权限', limit: 3, slug: 'task-planning-agent' },
  { label: '读取证据：task-planning-agent', tool: 'inspect_project_evidence', query: '', limit: 3, slug: 'task-planning-agent' },
  { label: '读取证据：rag-knowledge-base', tool: 'inspect_project_evidence', query: '', limit: 3, slug: 'rag-knowledge-base' }
]

const toolMeta: Record<McpToolName, { label: string; hint: string; permission: string }> = {
  search_knowledge: { label: 'search_knowledge', hint: '检索已发布知识点', permission: 'knowledge:read' },
  inspect_project_evidence: { label: 'inspect_project_evidence', hint: '读取项目交付证据', permission: 'projects:read' }
}

function SearchOutput({ output }: { output: unknown }) {
  const data = output as {
    count: number
    items: Array<{ slug: string; title: string; category: string; level: string; summary: string; href: string }>
  }
  return (
    <div className="runtime-search-results">
      {data.items.map((item) => (
        <Link href={item.href} key={item.slug}>
          <span>{item.category} · {item.level}</span>
          <strong>{item.title}</strong>
          <p>{item.summary}</p>
          <ArrowUpRight size={14} />
        </Link>
      ))}
      {!data.count ? <p>没有命中足够相关的已发布知识点。</p> : null}
    </div>
  )
}

function ProjectOutput({ output }: { output: unknown }) {
  const data = output as {
    title: string
    deliveryStatus: string
    evidenceSummary: string
    commands: string[]
    artifacts: string[]
    href: string
  }
  return (
    <div className="runtime-project-result">
      <div><span>{data.deliveryStatus}</span><strong>{data.title}</strong></div>
      <p>{data.evidenceSummary}</p>
      <dl>
        <div><dt>验证命令</dt><dd>{data.commands.join(' · ')}</dd></div>
        <div><dt>证据产物</dt><dd>{data.artifacts.join(' · ')}</dd></div>
      </dl>
      <Link href={data.href}>打开项目证据 <ArrowUpRight size={14} /></Link>
    </div>
  )
}

export function McpToolsLab({ projects }: { projects: ProjectOption[] }) {
  const [tool, setTool] = useState<McpToolName>('search_knowledge')
  const [query, setQuery] = useState(presets[0].query)
  const [limit, setLimit] = useState(presets[0].limit)
  const [slug, setSlug] = useState(presets[0].slug)
  const [trace, setTrace] = useState<TraceEntry[]>([])
  const [outcome, setOutcome] = useState<ToolOutcome | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canRun = tool === 'search_knowledge' ? query.trim().length >= 2 : slug.trim().length >= 2

  function pushEntry(entry: Omit<TraceEntry, 'key'>) {
    setTrace((current) => [...current, { ...entry, key: `${current.length + 1}-${entry.method}-${entry.direction}` }])
  }

  async function sendRpc(payload: Record<string, unknown>) {
    const startedAt = performance.now()
    const response = await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const durationMs = Math.round(performance.now() - startedAt)
    const body = response.status === 202 ? null : (await response.json()) as JsonRpcBody
    return { status: response.status, body, durationMs }
  }

  function applyPreset(preset: (typeof presets)[number]) {
    setTool(preset.tool)
    setQuery(preset.query)
    setLimit(preset.limit)
    setSlug(preset.slug)
  }

  async function runSession() {
    setLoading(true)
    setError(null)
    setOutcome(null)
    setTrace([])

    try {
      // ① initialize：协商协议版本与能力
      const initializeRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'mcp-lab-playground', version: '1.0.0' }
        }
      }
      pushEntry({ direction: 'request', method: 'initialize', summary: '① 握手：声明客户端协议版本与身份', payload: initializeRequest })
      const initialize = await sendRpc(initializeRequest)
      pushEntry({
        direction: 'response',
        method: 'initialize',
        summary: 'server 确认协议版本并公布 capabilities',
        payload: initialize.body,
        status: initialize.status,
        durationMs: initialize.durationMs,
        hasError: Boolean(initialize.body?.error)
      })
      if (initialize.body?.error) throw new Error(`initialize 失败：${initialize.body.error.code} ${initialize.body.error.message}`)

      // ② notifications/initialized：通知不应答
      const initializedNotification = { jsonrpc: '2.0', method: 'notifications/initialized' }
      pushEntry({ direction: 'notification', method: 'notifications/initialized', summary: '② 客户端确认初始化完成（通知）', payload: initializedNotification })
      const notified = await sendRpc(initializedNotification)
      pushEntry({
        direction: 'response',
        method: 'notifications/initialized',
        summary: '通知不应答：HTTP 202 且无响应体',
        payload: null,
        status: notified.status,
        durationMs: notified.durationMs
      })

      // ③ tools/list：发现工具
      const listRequest = { jsonrpc: '2.0', id: 2, method: 'tools/list' }
      pushEntry({ direction: 'request', method: 'tools/list', summary: '③ 发现工具：请求 server 公布 Schema', payload: listRequest })
      const listed = await sendRpc(listRequest)
      const toolCount = listed.body?.result?.tools?.length ?? 0
      pushEntry({
        direction: 'response',
        method: 'tools/list',
        summary: `server 返回 ${toolCount} 个只读工具的 MCP Schema`,
        payload: listed.body,
        status: listed.status,
        durationMs: listed.durationMs,
        hasError: Boolean(listed.body?.error)
      })
      if (listed.body?.error) throw new Error(`tools/list 失败：${listed.body.error.code} ${listed.body.error.message}`)

      // ④ tools/call：按 name + arguments 调用
      const callArguments = tool === 'search_knowledge' ? { query: query.trim(), limit } : { slug: slug.trim() }
      const callRequest = { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: tool, arguments: callArguments } }
      pushEntry({ direction: 'request', method: 'tools/call', summary: '④ 调用工具：name + arguments', payload: callRequest })
      const called = await sendRpc(callRequest)
      pushEntry({
        direction: 'response',
        method: 'tools/call',
        summary: '工具执行结果（MCP content / structuredContent）',
        payload: called.body,
        status: called.status,
        durationMs: called.durationMs,
        hasError: Boolean(called.body?.error || called.body?.result?.isError)
      })
      if (called.body?.error) throw new Error(`tools/call 失败：${called.body.error.code} ${called.body.error.message}`)

      const callResult = called.body?.result
      if (callResult?.isError) {
        setOutcome({ ok: false, name: tool, errorText: callResult.content?.[0]?.text ?? '工具执行失败。' })
      } else {
        setOutcome({ ok: true, name: tool, output: callResult?.structuredContent ?? null })
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'MCP 会话执行失败。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="server-runtime" aria-labelledby="mcp-lab-title">
      <header className="server-runtime__header">
        <div>
          <p className="eyebrow">MINIMAL MCP SERVER · POST /api/mcp</p>
          <h2 id="mcp-lab-title">运行一次完整的 MCP 会话</h2>
          <p>每次运行真实发出 4 条 HTTP 消息：initialize → notifications/initialized → tools/list → tools/call，右侧逐帧展示 JSON-RPC 请求与响应原文。</p>
        </div>
        <dl>
          <div><dt>协议方法</dt><dd>5</dd></div>
          <div><dt>MCP 只读工具</dt><dd>2</dd></div>
          <div><dt>写工具暴露</dt><dd>0</dd></div>
        </dl>
      </header>

      <div className="server-runtime__workspace">
        <div className="runtime-composer">
          <div className="runtime-mode-line">
            <span data-testid="mcp-transport"><ServerCog size={15} /> JSON-RPC 2.0 · 单请求无状态</span>
            <small>streamable HTTP transport</small>
          </div>

          <div className={styles.toolSwitch} role="group" aria-label="选择要调用的 MCP 工具">
            {(Object.keys(toolMeta) as McpToolName[]).map((name) => (
              <button aria-pressed={tool === name} key={name} onClick={() => setTool(name)} type="button">
                <code>{toolMeta[name].label}</code>
                <small>{toolMeta[name].hint} · {toolMeta[name].permission}</small>
              </button>
            ))}
          </div>

          {tool === 'search_knowledge' ? (
            <>
              <div className={styles.field}>
                <label htmlFor="mcp-query">arguments.query</label>
                <input
                  id="mcp-query"
                  maxLength={120}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="要检索的 AI 工程问题或关键词"
                  value={query}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="mcp-limit">arguments.limit</label>
                <select id="mcp-limit" onChange={(event) => setLimit(Number(event.target.value))} value={limit}>
                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <small>输入会原样放进 tools/call 的 params.arguments，并经过服务端 Zod 严格校验。</small>
              </div>
            </>
          ) : (
            <div className={styles.field}>
              <label htmlFor="mcp-slug">arguments.slug</label>
              <select id="mcp-slug" onChange={(event) => setSlug(event.target.value)} value={slug}>
                {projects.map((project) => <option key={project.slug} value={project.slug}>{project.slug} · {project.title}</option>)}
              </select>
              <small>输入会原样放进 tools/call 的 params.arguments，并经过服务端 Zod 严格校验。</small>
            </div>
          )}

          <div className="runtime-presets" aria-label="任务样例">
            {presets.map((preset) => (
              <button
                aria-pressed={tool === preset.tool && query === preset.query && slug === preset.slug && limit === preset.limit}
                key={preset.label}
                onClick={() => applyPreset(preset)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            className="button button--primary runtime-run-button"
            data-testid="mcp-run"
            disabled={loading || !canRun}
            onClick={runSession}
            type="button"
          >
            {loading ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
            {loading ? 'MCP 会话进行中' : '发送完整 MCP 会话'}
          </button>

          <div className="runtime-guardrails">
            <div><ShieldCheck size={16} /><span>只读工具经 MCP 暴露；save_learning_note 只走站内人工审批</span></div>
            <div><TerminalSquare size={16} /><span>协议错误返回标准 JSON-RPC error（-32601 / -32602 / -32600）</span></div>
            <div><Braces size={16} /><span>Schema 与权限守卫复用受控 Agent 运行时，无第二份实现</span></div>
          </div>
        </div>

        <div className="runtime-output" aria-live="polite">
          {!trace.length && !error ? (
            <div className="runtime-empty"><Search size={24} /><p>运行后，这里会逐帧展示 initialize、tools/list、tools/call 的 JSON-RPC 请求与响应原文。</p></div>
          ) : null}
          {error ? <div className="runtime-error" data-testid="mcp-error"><strong>会话中断</strong><p>{error}</p></div> : null}

          {trace.length ? (
            <ol className={styles.trace} data-testid="mcp-trace">
              {trace.map((entry, index) => (
                <li className={styles.message} data-has-error={entry.hasError ? 'true' : 'false'} data-testid="mcp-message" key={entry.key}>
                  <header className={styles.messageHeader}>
                    <span className={styles.direction} data-kind={entry.direction}>
                      {entry.direction === 'request' ? '→ 请求' : entry.direction === 'response' ? '← 响应' : '⇢ 通知'}
                    </span>
                    <code>{entry.method}</code>
                    <span className={styles.messageSummary}>{String(index + 1).padStart(2, '0')} · {entry.summary}</span>
                    {entry.status ? <span className={styles.statusChip} data-tone={entry.hasError ? 'error' : 'ok'}>HTTP {entry.status}</span> : null}
                    {typeof entry.durationMs === 'number' ? <time>{entry.durationMs}ms</time> : null}
                  </header>
                  {entry.payload === null ? (
                    <p className={styles.emptyPayload}>（无响应体）通知不应答，这是 JSON-RPC 的通知语义：initialized 不需要 result，也不返回 error。</p>
                  ) : (
                    <pre className={styles.payload}>{JSON.stringify(entry.payload, null, 2)}</pre>
                  )}
                </li>
              ))}
            </ol>
          ) : null}

          {outcome ? (
            <div className={styles.toolResult} data-testid="mcp-tool-result">
              <header className={styles.toolResultHead}>
                <div><code>{outcome.name}</code><span>structuredContent 预览</span></div>
                <span className={styles.toolResultBadge} data-tone={outcome.ok ? 'ok' : 'error'}>{outcome.ok ? 'isError: false' : 'isError: true'}</span>
              </header>
              {outcome.ok ? (
                outcome.name === 'search_knowledge' ? <SearchOutput output={outcome.output} /> : <ProjectOutput output={outcome.output} />
              ) : (
                <p className="runtime-observation__error">{outcome.errorText}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
