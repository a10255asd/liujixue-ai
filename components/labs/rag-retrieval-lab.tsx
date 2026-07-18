'use client'

import { AlertTriangle, CheckCircle2, Database, FileText, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  embedRagQuery,
  RAG_VECTOR_MODEL_DOWNLOAD_HINT,
  type ModelLoadProgress
} from '@/components/labs/rag-vector-embedder'
import {
  answerWithCitations,
  type EvaluationCase,
  type RagEvaluationReport,
  type RetrievalMode
} from '@/lib/labs/rag-retrieval'

type RagRetrievalLabProps = {
  documentCount: number
  chunkCount: number
  evaluationCases: EvaluationCase[]
  reports: RagEvaluationReport[]
  vectorModel: {
    model: string
    dtype: string
    dimensions: number
    generatedAt: string
  }
}

type VectorModelStatus =
  | { state: 'loading'; progress: ModelLoadProgress | null }
  | { state: 'ready' }
  | { state: 'error'; message: string }

type RagAnswer = ReturnType<typeof answerWithCitations>

const modeNotes: Record<RetrievalMode, string> = {
  keyword: '关键词基线：字符 n-gram 词面重叠，没有任何语义理解，用来暴露“纯词面”的天花板。',
  hybrid: '混合检索：词面重叠 × 语料稀有词权重 + 显式概念标签，纯确定性规则，不伪装成语义检索。',
  vector: '向量（本地模型）：查询向量在你的浏览器本地计算，不发送到任何服务器；本地量化多语言小模型，非生产级 embedding 服务。'
}

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatMB(bytes: number) {
  return `${(bytes / 1048576).toFixed(0)}MB`
}

export function RagRetrievalLab({ documentCount, chunkCount, evaluationCases, reports, vectorModel }: RagRetrievalLabProps) {
  const [mode, setMode] = useState<RetrievalMode>('hybrid')
  const [query, setQuery] = useState(evaluationCases[0]?.query ?? '')
  const [submittedQuery, setSubmittedQuery] = useState(query)
  const [vectorAnswer, setVectorAnswer] = useState<RagAnswer | null>(null)
  const [vectorStatus, setVectorStatus] = useState<VectorModelStatus>({ state: 'ready' })
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    if (mode !== 'vector') return undefined

    let cancelled = false
    setVectorAnswer(null)
    setVectorStatus({ state: 'loading', progress: null })

    embedRagQuery(submittedQuery, (progress) => {
      if (!cancelled) setVectorStatus({ state: 'loading', progress })
    })
      .then((queryEmbedding) => {
        if (cancelled) return
        setVectorStatus({ state: 'ready' })
        setVectorAnswer(answerWithCitations(submittedQuery, 'vector', { queryEmbedding }))
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setVectorStatus({ state: 'error', message: error instanceof Error ? error.message : String(error) })
      })

    return () => {
      cancelled = true
    }
  }, [mode, submittedQuery, retryTick])

  const lexicalResponse = useMemo(
    () => answerWithCitations(submittedQuery, mode === 'vector' ? 'hybrid' : mode),
    [submittedQuery, mode]
  )
  const response = mode === 'vector' ? vectorAnswer : lexicalResponse
  const activeReport = reports.find((report) => report.mode === mode) ?? reports[0]

  function submitQuery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextQuery = query.trim()
    if (nextQuery) setSubmittedQuery(nextQuery)
  }

  const comparisonRows = [
    ['Hit@3', 'hitAt3'],
    ['MRR', 'mrr'],
    ['引用覆盖', 'citationCoverage'],
    ['未知问题拒答', 'unknownRejectionRate']
  ] as const

  return (
    <div className="rag-lab">
      <section className="rag-ingestion" aria-label="入库概览">
        <div><Database size={19} aria-hidden="true" /><span>内部手册</span><strong>{documentCount}</strong></div>
        <div><FileText size={19} aria-hidden="true" /><span>稳定章节块</span><strong>{chunkCount}</strong></div>
        <div><CheckCircle2 size={19} aria-hidden="true" /><span>固定评估题</span><strong>{evaluationCases.length}</strong></div>
        <p>
          每个引用都保留文档、版本和章节 ID。文档向量在构建期用本地开源模型生成并随站点静态分发；
          向量模式的查询向量在你的浏览器本地计算，不把问题发送到任何服务器。
        </p>
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
          <p className="rag-mode-note">{modeNotes[mode]}</p>

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

        {mode === 'vector' && !response ? (
          <div className={`rag-answer-panel rag-answer-panel--loading ${vectorStatus.state === 'error' ? 'rag-answer-panel--empty' : ''}`}>
            {vectorStatus.state === 'error' ? (
              <>
                <div className="rag-answer-panel__status"><AlertTriangle size={19} /><span>本地模型加载失败</span></div>
                <p>模型文件下载或 WASM 初始化出错：{vectorStatus.message}</p>
                <button className="button button--ghost" onClick={() => setRetryTick((tick) => tick + 1)} type="button">重试加载</button>
              </>
            ) : (
              <>
                <div className="rag-answer-panel__status"><Database size={19} /><span>正在加载本地向量模型</span></div>
                <p>
                  首次使用需在浏览器下载 {vectorModel.model}（{vectorModel.dtype} 量化，{vectorModel.dimensions} 维，
                  {RAG_VECTOR_MODEL_DOWNLOAD_HINT}），只下载一次，之后走浏览器缓存。查询在本地计算，不经过服务器。
                </p>
                <div className="rag-model-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(vectorStatus.state === 'loading' ? vectorStatus.progress?.percent ?? 0 : 0)}>
                  <div style={{ width: `${vectorStatus.state === 'loading' ? vectorStatus.progress?.percent ?? 0 : 0}%` }} />
                </div>
                <small className="rag-model-progress__meta">
                  {vectorStatus.state === 'loading' && vectorStatus.progress
                    ? `${vectorStatus.progress.file} · ${formatMB(vectorStatus.progress.loadedBytes)} / ${formatMB(vectorStatus.progress.totalBytes)}`
                    : '正在初始化 WASM 运行时…'}
                </small>
              </>
            )}
          </div>
        ) : response ? (
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
                  <span>#{candidate.rank}</span><strong>{candidate.heading}</strong>
                  <small>
                    {mode === 'vector'
                      ? `余弦相似度 ${candidate.vectorScore.toFixed(3)}`
                      : `词面 ${candidate.lexicalScore.toFixed(3)} · 概念 ${candidate.conceptScore.toFixed(3)} · 总分 ${candidate.score.toFixed(3)}`}
                  </small>
                </div>
              ))}
            </details>
          </div>
        ) : null}
      </section>

      <section className="rag-evaluation">
        <div className="rag-section-heading"><span>02</span><div><p className="eyebrow">RETRIEVAL EVALUATION</p><h2>质量不是一句“效果不错”</h2></div></div>

        <div className="rag-comparison" role="region" aria-label="三路检索对比">
          <table>
            <thead>
              <tr><th>指标（{evaluationCases.length} 条固定题）</th>{reports.map((report) => <th key={report.mode}>{report.label}</th>)}</tr>
            </thead>
            <tbody>
              {comparisonRows.map(([label, key]) => {
                const best = Math.max(...reports.map((report) => report[key]))
                return (
                  <tr key={key}>
                    <th>{label}</th>
                    {reports.map((report) => (
                      <td className={report[key] === best ? 'is-best' : ''} key={report.mode}>{report[key].toFixed(3)}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p>
            三路结果全部离线复算、如实展示：本固定题集上向量模式与混合检索打平。
            向量分数带很窄（正例 top1 余弦 0.889–0.943，未知题最高 0.871），拒答阈值 0.88 是按当前题集校准的脆弱边界——
            本地量化小模型的中文检索不天然优于精心调过的词面混合，这正是需要离线评估的原因。
          </p>
        </div>

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
