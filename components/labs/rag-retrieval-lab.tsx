'use client'

import { AlertTriangle, CheckCircle2, Database, FileText, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { answerWithCitations, type EvaluationCase, type RagEvaluationReport, type RetrievalMode } from '@/lib/labs/rag-retrieval'

type RagRetrievalLabProps = {
  documentCount: number
  chunkCount: number
  evaluationCases: EvaluationCase[]
  reports: RagEvaluationReport[]
}

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`
}

export function RagRetrievalLab({ documentCount, chunkCount, evaluationCases, reports }: RagRetrievalLabProps) {
  const [mode, setMode] = useState<RetrievalMode>('hybrid')
  const [query, setQuery] = useState(evaluationCases[0]?.query ?? '')
  const [submittedQuery, setSubmittedQuery] = useState(query)
  const response = useMemo(() => answerWithCitations(submittedQuery, mode), [submittedQuery, mode])
  const activeReport = reports.find((report) => report.mode === mode) ?? reports[0]

  function submitQuery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextQuery = query.trim()
    if (nextQuery) setSubmittedQuery(nextQuery)
  }

  return (
    <div className="rag-lab">
      <section className="rag-ingestion" aria-label="入库概览">
        <div><Database size={19} aria-hidden="true" /><span>内部手册</span><strong>{documentCount}</strong></div>
        <div><FileText size={19} aria-hidden="true" /><span>稳定章节块</span><strong>{chunkCount}</strong></div>
        <div><CheckCircle2 size={19} aria-hidden="true" /><span>固定评估题</span><strong>{evaluationCases.length}</strong></div>
        <p>每个引用都保留文档、版本和章节 ID；当前原型不连接向量库，也不发送模型请求。</p>
      </section>

      <section className="rag-workbench">
        <div className="rag-query-panel">
          <div className="rag-section-heading"><span>01</span><div><p className="eyebrow">RETRIEVAL WORKBENCH</p><h2>先找证据，再组织答案</h2></div></div>
          <div className="rag-mode-switch" role="tablist" aria-label="检索模式">
            {reports.map((report) => (
              <button
                aria-selected={mode === report.mode}
                key={report.mode}
                onClick={() => setMode(report.mode)}
                role="tab"
                type="button"
              >
                <span>{report.label}</span>
                <small>MRR {report.mrr.toFixed(3)}</small>
              </button>
            ))}
          </div>

          <form onSubmit={submitQuery}>
            <label htmlFor="rag-query">向内部手册提问</label>
            <textarea
              data-testid="rag-query"
              id="rag-query"
              onChange={(event) => setQuery(event.target.value)}
              rows={3}
              value={query}
            />
            <button className="button button--primary" type="submit"><Search size={16} /> 检索并生成引用答案</button>
          </form>

          <div className="rag-sample-queries" aria-label="评估样例">
            <small>直接试一个固定样例</small>
            <div>
              {evaluationCases.slice(0, 5).map((item) => (
                <button key={item.id} onClick={() => { setQuery(item.query); setSubmittedQuery(item.query) }} type="button">{item.query}</button>
              ))}
            </div>
          </div>
        </div>

        <div className={`rag-answer-panel ${response.hasEvidence ? 'rag-answer-panel--found' : 'rag-answer-panel--empty'}`}>
          <div className="rag-answer-panel__status">
            {response.hasEvidence ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
            <span>{response.hasEvidence ? '找到可引用证据' : '证据不足，拒绝作答'}</span>
          </div>
          <p data-testid="rag-answer">{response.answer}</p>
          {response.citations.length ? (
            <ol className="rag-citations">
              {response.citations.map((citation) => (
                <li data-testid="rag-citation" key={citation.id}>
                  <span>{citation.rank}</span>
                  <div><strong>{citation.documentTitle}</strong><p>{citation.heading} · v{citation.version} · {citation.id}</p></div>
                  <small>{citation.score.toFixed(3)}</small>
                </li>
              ))}
            </ol>
          ) : null}
          <details className="rag-candidates">
            <summary>查看 Top 3 检索轨迹</summary>
            {response.candidates.map((candidate) => (
              <div key={candidate.id}>
                <span>#{candidate.rank}</span><strong>{candidate.heading}</strong><small>词面 {candidate.lexicalScore.toFixed(3)} · 概念 {candidate.conceptScore.toFixed(3)} · 总分 {candidate.score.toFixed(3)}</small>
              </div>
            ))}
          </details>
        </div>
      </section>

      <section className="rag-evaluation">
        <div className="rag-section-heading"><span>02</span><div><p className="eyebrow">RETRIEVAL EVALUATION</p><h2>质量不是一句“效果不错”</h2></div></div>
        <div className="rag-evaluation__reports">
          {reports.map((report) => (
            <article className={report.mode === mode ? 'is-active' : ''} key={report.mode}>
              <header><span>{report.label}</span><strong data-testid={report.mode === 'hybrid' ? 'rag-eval-mrr' : undefined}>{report.mrr.toFixed(3)}</strong><small>MRR</small></header>
              <dl>
                <div><dt>Hit@3</dt><dd>{formatRate(report.hitAt3)}</dd></div>
                <div><dt>引用覆盖</dt><dd>{formatRate(report.citationCoverage)}</dd></div>
                <div><dt>未知问题拒答</dt><dd>{formatRate(report.unknownRejectionRate)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        <div className="rag-evaluation__cases">
          <div className="rag-evaluation__case-head"><span>评估问题</span><span>期望章节</span><span>{activeReport?.label}结果</span></div>
          {activeReport?.cases.map((item) => (
            <div key={item.id}>
              <p>{item.query}</p>
              <code>{item.relevantChunkIds.length ? item.relevantChunkIds.join(' / ') : '应拒绝回答'}</code>
              <span className={item.hitAt3 ? 'pass' : 'fail'}>{item.hitAt3 ? '命中' : '未命中'} · RR {item.reciprocalRank.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
