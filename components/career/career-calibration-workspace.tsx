'use client'

import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  RotateCcw,
  ShieldAlert,
  Target
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { CareerCalibrationReport } from '@/lib/labs/career-calibration'
import { interviewRubric, scoreMockInterview } from '@/lib/labs/mock-interview-scoring'

const evidenceLabels = {
  strong: '强证据',
  partial: '部分证据',
  gap: '证据缺口'
} as const

type Props = {
  reports: CareerCalibrationReport[]
  capabilityCount: number
  prototypeCount: number
  verifiedCount: number
}

export function CareerCalibrationWorkspace({ reports, capabilityCount, prototypeCount, verifiedCount }: Props) {
  const [reportId, setReportId] = useState(reports[0].sample.id)
  const [selectedCriteria, setSelectedCriteria] = useState<Record<string, string[]>>({})
  const report = reports.find((item) => item.sample.id === reportId) ?? reports[0]
  const score = useMemo(
    () => scoreMockInterview(report.interview, selectedCriteria),
    [report.interview, selectedCriteria]
  )
  const weakestCapability = report.signals.find((signal) => signal.capabilityId === score.weakestCapabilityId)

  function selectReport(id: string) {
    setReportId(id)
    setSelectedCriteria({})
  }

  function toggleCriterion(questionId: string, criterionId: string) {
    setSelectedCriteria((current) => {
      const selected = new Set(current[questionId] ?? [])
      if (selected.has(criterionId)) selected.delete(criterionId)
      else selected.add(criterionId)
      return { ...current, [questionId]: [...selected] }
    })
  }

  return (
    <div className="career-calibration">
      <section className="calibration-summary" aria-label="岗位校准数据概览">
        <div><strong>{reports.length}</strong><span>真实岗位样本</span></div>
        <div><strong>{capabilityCount}</strong><span>统一能力域</span></div>
        <div><strong>{prototypeCount}</strong><span>可运行原型</span></div>
        <div><strong>{verifiedCount}</strong><span>已验证交付</span></div>
      </section>

      <section className="jd-target-panel">
        <div className="jd-target-panel__intro">
          <p className="eyebrow">TARGET ROLE</p>
          <h2>选择一份真实 JD</h2>
          <p>岗位页面可能更新或下线，样本保留访问日期和原始链接。校准分只代表当前作品集证据覆盖，不代表录用概率。</p>
        </div>
        <label className="jd-target-select">
          <span>目标岗位</span>
          <select data-testid="jd-source-select" onChange={(event) => selectReport(event.target.value)} value={report.sample.id}>
            {reports.map((item) => (
              <option key={item.sample.id} value={item.sample.id}>{item.sample.company} · {item.sample.role}</option>
            ))}
          </select>
        </label>
        <div className="jd-source-brief">
          <div><span>{report.sample.sourceType} · 访问于 {report.sample.accessedAt}</span><h3>{report.sample.company} · {report.sample.role}</h3><p>{report.sample.location}</p></div>
          <p>{report.sample.summary}</p>
          <a href={report.sample.sourceUrl} rel="noreferrer" target="_blank">查看原始岗位 <ExternalLink size={14} /></a>
        </div>
      </section>

      <section className="coverage-section">
        <header className="calibration-section-heading">
          <div><p className="eyebrow">EVIDENCE COVERAGE</p><h2>岗位要求与作品集证据</h2></div>
          <div className="coverage-score"><span>证据覆盖分</span><strong data-testid="jd-coverage-score">{report.coverageScore}<small>/100</small></strong></div>
        </header>

        <div className="coverage-legend">
          <span><i className="partial" />部分证据 {report.partialSignals}</span>
          <span><i className="gap" />证据缺口 {report.gapSignals}</span>
          <p>当前没有 `verified` 项目，因此原型不会被计算为强证据。</p>
        </div>

        <div className="coverage-matrix">
          {report.signals.map((signal) => (
            <article className={`coverage-row coverage-row--${signal.evidence.level}`} key={signal.capabilityId}>
              <div className="coverage-row__capability">
                <span>{signal.weight === 3 ? '核心要求' : signal.weight === 2 ? '重要要求' : '补充要求'}</span>
                <h3>{signal.capabilityTitle}</h3>
                <p>{signal.requirement}</p>
              </div>
              <div className="coverage-row__meter">
                <div><span>{evidenceLabels[signal.evidence.level]}</span><strong>{signal.evidence.score}</strong></div>
                <div aria-label={`${signal.capabilityTitle} 证据分 ${signal.evidence.score}`}><i style={{ width: `${signal.evidence.score}%` }} /></div>
              </div>
              <div className="coverage-row__projects">
                <span>现有证据</span>
                {signal.evidence.projects.map((project) => (
                  <Link href={project.demoPath ?? `/projects/${project.slug}`} key={project.slug}>
                    {project.title}<small>{project.deliveryStatus}</small>
                  </Link>
                ))}
              </div>
              <div className="coverage-row__action">
                <span>下一步</span><p>{signal.evidence.nextAction}</p><Link href={signal.evidence.nextHref}>进入训练 <ArrowRight size={13} /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mock-interview-section">
        <header className="calibration-section-heading">
          <div><p className="eyebrow">EVIDENCE INTERVIEW</p><h2>针对这份 JD 的 5 题模拟面试</h2></div>
          <button className="calibration-reset" onClick={() => setSelectedCriteria({})} type="button"><RotateCcw size={15} /> 重置本轮</button>
        </header>

        <div className="interview-scoreboard">
          <div className="interview-scoreboard__score">
            <span>本轮证据得分</span>
            <strong data-testid="mock-interview-score">{score.percentage}<small>%</small></strong>
            <p>{score.points}/{score.maximumPoints} 个评分锚点 · 已作答 {score.answeredQuestions}/{report.interview.length}</p>
          </div>
          <div className="interview-scoreboard__feedback">
            {score.percentage >= 65 ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
            <div><span>当前判断</span><strong>{score.feedback}</strong></div>
          </div>
          <div className="interview-scoreboard__next" data-testid="mock-weakest">
            <span>最低分能力</span>
            <strong>{weakestCapability?.capabilityTitle ?? '完成本轮后生成'}</strong>
            {weakestCapability ? <Link href={weakestCapability.evidence.nextHref}>补这项证据 <ArrowRight size={13} /></Link> : null}
          </div>
        </div>

        <div className="mock-question-list">
          {report.interview.map((item, index) => {
            const selected = new Set(selectedCriteria[item.id] ?? [])
            return (
              <article className="mock-question" key={item.id}>
                <div className="mock-question__index"><span>QUESTION</span><strong>{String(index + 1).padStart(2, '0')}</strong></div>
                <div className="mock-question__body">
                  <div className="mock-question__meta"><span>{item.capabilityTitle}</span><small>{item.level}</small></div>
                  <h3>{item.question}</h3>
                  <p>{item.evidencePrompt}</p>
                  <div className="mock-question__links">
                    <Link href={item.questionHref}><FileSearch size={14} /> 查看回答结构</Link>
                    {item.project ? <Link href={item.project.href}><BriefcaseBusiness size={14} /> {item.project.title}<small>{item.project.deliveryStatus}</small></Link> : null}
                  </div>
                </div>
                <fieldset className="mock-rubric">
                  <legend>回答后按证据勾选</legend>
                  {interviewRubric.map((criterion) => (
                    <label key={criterion.id}>
                      <input
                        checked={selected.has(criterion.id)}
                        onChange={() => toggleCriterion(item.id, criterion.id)}
                        type="checkbox"
                      />
                      <span><strong>{criterion.label}</strong><small>{criterion.description}</small></span>
                    </label>
                  ))}
                </fieldset>
              </article>
            )
          })}
        </div>
      </section>

      <section className="calibration-boundary">
        <Target size={20} />
        <p><strong>这套工具评的是证据准备程度。</strong>它不读取语音、不判断答案真实性、不预测面试结果；每个勾选项都需要你能现场展开并接受追问。</p>
      </section>
    </div>
  )
}
