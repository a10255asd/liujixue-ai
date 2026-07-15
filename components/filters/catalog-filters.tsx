'use client'

import { RotateCcw, Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

import { InterviewCard, KnowledgeCard, ProjectCard } from '@/components/content/content-cards'
import { filterKnowledge, filterProjects, filterQuestions } from '@/lib/content/filters'
import { getCategoryLabel, sortChinese } from '@/lib/content/labels'
import type { InterviewQuestion, KnowledgePoint, PracticalProject } from '@/lib/content/schemas'

type FilterOption = { value: string; label: string }

function uniqueOptions(values: string[], labels?: (value: string) => string): FilterOption[] {
  return sortChinese([...new Set(values)]).map((value) => ({ value, label: labels?.(value) ?? value }))
}

function validParam(searchParams: URLSearchParams, name: string, options: FilterOption[]): string {
  const value = searchParams.get(name) ?? ''
  return options.some((option) => option.value === value) ? value : ''
}

function useCatalogQuery() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  function update(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    update({ q: query.trim() })
  }

  function clear() {
    setQuery('')
    router.replace(pathname, { scroll: false })
  }

  return { searchParams, query, setQuery, update, submit, clear }
}

function FilterShell({
  query,
  setQuery,
  submit,
  clear,
  count,
  total,
  children
}: {
  query: string
  setQuery: (value: string) => void
  submit: (event: FormEvent<HTMLFormElement>) => void
  clear: () => void
  count: number
  total: number
  children: React.ReactNode
}) {
  return (
    <div className="catalog-filter">
      <form className="catalog-filter__form" onSubmit={submit} role="search">
        <label className="catalog-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">搜索内容</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、摘要或标签"
            type="search"
            value={query}
          />
        </label>
        <button className="filter-submit" type="submit">筛选</button>
        {children}
        <button className="filter-clear" onClick={clear} type="button">
          <RotateCcw size={15} aria-hidden="true" />
          清除
        </button>
      </form>
      <p className="catalog-filter__count" aria-live="polite">
        显示 <strong>{count}</strong> / {total}
      </p>
    </div>
  )
}

function SelectFilter({
  label,
  name,
  value,
  options,
  onChange
}: {
  label: string
  name: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}) {
  return (
    <label className="catalog-select">
      <span className="sr-only">{label}</span>
      <select aria-label={label} name={name} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">全部{label}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function EmptyResults({ clear }: { clear: () => void }) {
  return (
    <div className="catalog-empty">
      <p className="eyebrow">NO MATCH</p>
      <h2>当前条件下没有内容</h2>
      <p>换一个关键词，或清除筛选查看完整目录。</p>
      <button className="button button--secondary" onClick={clear} type="button">查看全部</button>
    </div>
  )
}

export function KnowledgeCatalog({ items }: { items: KnowledgePoint[] }) {
  const controls = useCatalogQuery()
  const categoryOptions = uniqueOptions(items.map((item) => item.category), getCategoryLabel)
  const levelOptions = uniqueOptions(items.map((item) => item.level))
  const category = validParam(controls.searchParams, 'category', categoryOptions)
  const level = validParam(controls.searchParams, 'level', levelOptions)
  const visible = filterKnowledge(items, { query: controls.searchParams.get('q') ?? '', category, level })

  return (
    <>
      <FilterShell {...controls} count={visible.length} total={items.length}>
        <SelectFilter label="分类" name="category" onChange={(value) => controls.update({ category: value })} options={categoryOptions} value={category} />
        <SelectFilter label="难度" name="level" onChange={(value) => controls.update({ level: value })} options={levelOptions} value={level} />
      </FilterShell>
      {visible.length ? <div className="content-grid">{visible.map((item) => <KnowledgeCard item={item} key={item.slug} />)}</div> : <EmptyResults clear={controls.clear} />}
    </>
  )
}

export function InterviewCatalog({ items }: { items: InterviewQuestion[] }) {
  const controls = useCatalogQuery()
  const categoryOptions = uniqueOptions(items.map((item) => item.category), getCategoryLabel)
  const levelOptions = uniqueOptions(items.map((item) => item.level))
  const tagOptions = uniqueOptions(items.flatMap((item) => item.tags))
  const category = validParam(controls.searchParams, 'category', categoryOptions)
  const level = validParam(controls.searchParams, 'level', levelOptions)
  const tag = validParam(controls.searchParams, 'tag', tagOptions)
  const visible = filterQuestions(items, { query: controls.searchParams.get('q') ?? '', category, level, tag })

  return (
    <>
      <FilterShell {...controls} count={visible.length} total={items.length}>
        <SelectFilter label="分类" name="category" onChange={(value) => controls.update({ category: value })} options={categoryOptions} value={category} />
        <SelectFilter label="难度" name="level" onChange={(value) => controls.update({ level: value })} options={levelOptions} value={level} />
        <SelectFilter label="标签" name="tag" onChange={(value) => controls.update({ tag: value })} options={tagOptions} value={tag} />
      </FilterShell>
      {visible.length ? <div className="content-grid content-grid--questions">{visible.map((item) => <InterviewCard item={item} key={item.id} />)}</div> : <EmptyResults clear={controls.clear} />}
    </>
  )
}

export function ProjectCatalog({ items }: { items: PracticalProject[] }) {
  const controls = useCatalogQuery()
  const levelOptions = uniqueOptions(items.map((item) => item.level))
  const stackOptions = uniqueOptions(items.flatMap((item) => item.stack))
  const level = validParam(controls.searchParams, 'level', levelOptions)
  const stack = validParam(controls.searchParams, 'stack', stackOptions)
  const visible = filterProjects(items, { query: controls.searchParams.get('q') ?? '', level, stack })

  return (
    <>
      <FilterShell {...controls} count={visible.length} total={items.length}>
        <SelectFilter label="难度" name="level" onChange={(value) => controls.update({ level: value })} options={levelOptions} value={level} />
        <SelectFilter label="技术栈" name="stack" onChange={(value) => controls.update({ stack: value })} options={stackOptions} value={stack} />
      </FilterShell>
      {visible.length ? <div className="project-grid project-grid--catalog">{visible.map((item) => <ProjectCard item={item} key={item.slug} />)}</div> : <EmptyResults clear={controls.clear} />}
    </>
  )
}
