import { ExternalLink } from 'lucide-react'

import type { ApiContentMeta } from '@/lib/content/knowledge-api'

const sourceTypeLabels: Record<string, string> = {
  'official-doc': '官方文档',
  paper: '论文',
  repo: '代码仓库',
  book: '书籍',
  article: '文章',
  source: '资料'
}

const safetyLabels: Record<string, string> = {
  normal: '常规内容',
  caution: '需谨慎核验',
  high: '高风险内容'
}

function formatDate(value?: string | null): string {
  if (!value) return '待补充'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '待补充'
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function ContentProvenance({ meta, title = '内容档案' }: { meta: ApiContentMeta; title?: string }) {
  const visibleSourceCount = meta.sources.length
  const sourceSummary = meta.sourceCount > visibleSourceCount
    ? `${meta.sourceCount} 条来源，公开 ${visibleSourceCount} 条`
    : `${visibleSourceCount} 条`

  return (
    <div className="content-provenance">
      <span>{title}</span>
      <dl className="detail-meta-list content-provenance__meta">
        <div><dt>主题</dt><dd>{meta.topicCode}</dd></div>
        <div><dt>更新于</dt><dd>{formatDate(meta.updatedAt)}</dd></div>
        <div><dt>发布于</dt><dd>{formatDate(meta.publishedAt)}</dd></div>
        {meta.asOfDate ? <div><dt>内容截至</dt><dd>{formatDate(meta.asOfDate)}</dd></div> : null}
        <div><dt>内容级别</dt><dd>{safetyLabels[meta.safetyLevel ?? ''] ?? meta.safetyLevel ?? '常规内容'}</dd></div>
        {meta.disclaimerType ? <div><dt>内容声明</dt><dd>{meta.disclaimerType}</dd></div> : null}
        <div><dt>来源</dt><dd>{sourceSummary}</dd></div>
        {meta.viewCount > 0 ? <div><dt>阅读</dt><dd>{meta.viewCount} 次</dd></div> : null}
        <div><dt>内容 ID</dt><dd><code>{meta.publicId}</code></dd></div>
      </dl>
      <div className="content-provenance__sources">
        <strong>参考来源</strong>
        {meta.sources.length ? meta.sources.map((source) => {
          const sourceMeta = [source.publisher, sourceTypeLabels[source.sourceType] ?? source.sourceType]
            .filter(Boolean)
            .join(' · ')
          const content = (
            <>
              <span><b>{source.title}</b><small>{sourceMeta}</small></span>
              {source.url ? <ExternalLink aria-hidden="true" size={14} /> : null}
            </>
          )
          return source.url ? (
            <a href={source.url} key={`${source.title}-${source.url}`} rel="noreferrer" target="_blank">{content}</a>
          ) : <div className="content-provenance__source" key={`${source.title}-${sourceMeta}`}>{content}</div>
        }) : <p>站内原创内容，当前未附外部引用。</p>}
      </div>
    </div>
  )
}
