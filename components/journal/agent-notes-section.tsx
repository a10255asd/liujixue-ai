'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type AgentNote = {
  id: string
  title: string
  content: string
  createdAt: string
  runId: string | null
}

type NotesResponse = {
  notes?: AgentNote[]
  identityMode?: string
  storageMode?: string
  reason?: string | null
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: NotesResponse }

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function AgentNotesSection() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetch('/api/agent/notes', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`notes ${response.status}`)
        return (await response.json()) as NotesResponse
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  let body
  if (state.status === 'loading') {
    body = <p className="agent-notes__hint">正在读取当前会话的学习笔记…</p>
  } else if (state.status === 'error') {
    body = <p className="agent-notes__hint">笔记服务暂时不可用，请稍后刷新重试。</p>
  } else {
    const { data } = state
    const notes = data.notes ?? []
    const persistenceUnavailable = data.storageMode === 'response-only' || data.reason === 'identity-disabled' || data.reason === 'storage-disabled'
    if (persistenceUnavailable) {
      body = (
        <p className="agent-notes__hint">
          当前环境未开启笔记持久化（storageMode: response-only）：Agent 的学习笔记只会在运行响应里返回，不会写入仓储。配置签名会话密钥和 Upstash Redis 后，这里会列出当前会话保存的笔记。
        </p>
      )
    } else if (notes.length === 0) {
      body = (
        <p className="agent-notes__hint">
          当前会话还没有保存任何学习笔记。进入<Link href="/labs/controlled-agent">受控 Agent 实验</Link>，让 Agent 检索知识并“保存成学习笔记”，经人工审批后就会出现在这里。
        </p>
      )
    } else {
      body = (
        <ul className="agent-notes__list">
          {notes.map((note) => (
            <li className="agent-notes__item" key={note.id}>
              <div className="agent-notes__meta">
                <span>{formatDate(note.createdAt)}</span>
                {note.runId ? <span>run {note.runId.slice(0, 8)}</span> : null}
              </div>
              <h3>{note.title}</h3>
              <p>{note.content}</p>
            </li>
          ))}
        </ul>
      )
    }
  }

  return (
    <section className="agent-notes">
      <div className="section-heading">
        <div className="section-heading__title">
          <span>AGENT NOTES</span>
          <div>
            <h2>Agent 学习笔记</h2>
            <p>由受控 Agent 在授权运行中经人工审批写入，按签名会话隔离，24 小时过期。</p>
          </div>
        </div>
        <div>
          <Link className="text-link" href="/labs/controlled-agent">去做一次受控运行 <ArrowRight size={16} /></Link>
        </div>
      </div>
      {body}
    </section>
  )
}
