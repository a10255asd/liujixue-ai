'use client'

import {
  AlertOctagon,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDot,
  GitCompareArrows,
  ShieldCheck,
  ShieldX,
  X
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  dimensionLabels,
  getAgentEvaluationReports,
  type AgentEvaluationReport,
  type EvaluationDimension
} from '@/lib/labs/agent-evaluation'

const dimensionOrder = Object.keys(dimensionLabels) as EvaluationDimension[]

function GateIcon({ passed }: { passed: boolean }) {
  return passed ? <ShieldCheck size={26} /> : <ShieldX size={26} />
}

export function AgentEvaluationLab() {
  const reports = useMemo(getAgentEvaluationReports, [])
  const [versionId, setVersionId] = useState<AgentEvaluationReport['versionId']>('legacy-loop')
  const report = reports.find((item) => item.versionId === versionId) ?? reports[0]
  const [scenarioId, setScenarioId] = useState(report.scenarios[0].scenarioId)
  const selectedScenario = report.scenarios.find((item) => item.scenarioId === scenarioId) ?? report.scenarios[0]

  function selectVersion(nextVersionId: AgentEvaluationReport['versionId']) {
    const nextReport = reports.find((item) => item.versionId === nextVersionId)
    setVersionId(nextVersionId)
    if (nextReport && !nextReport.scenarios.some((item) => item.scenarioId === scenarioId)) {
      setScenarioId(nextReport.scenarios[0].scenarioId)
    }
  }

  return (
    <div className="agent-eval">
      <section className="agent-eval__summary" aria-label="评测数据集概览">
        <div><strong>{reports.length}</strong><span>策略版本</span></div>
        <div><strong>{report.scenarios.length}</strong><span>固定样本</span></div>
        <div><strong>{dimensionOrder.length}</strong><span>评测维度</span></div>
        <p><GitCompareArrows size={18} /> 同一组执行目标、同一组门槛，只改变控制策略。报告由仓库内确定性轨迹复算，不连接真实模型或外部工具。</p>
      </section>

      <div className="eval-version-tabs" role="tablist" aria-label="策略版本">
        {reports.map((item) => (
          <button
            aria-selected={item.versionId === report.versionId}
            key={item.versionId}
            onClick={() => selectVersion(item.versionId)}
            role="tab"
            type="button"
          >
            <span>{item.shortLabel}</span>
            <div><strong>{item.versionLabel}</strong><small>{item.description}</small></div>
            <b>{item.overallScore}</b>
          </button>
        ))}
      </div>

      <section
        className={`eval-gate ${report.gate.passed ? 'eval-gate--passed' : 'eval-gate--blocked'}`}
        data-testid="eval-release-status"
      >
        <GateIcon passed={report.gate.passed} />
        <div>
          <span>RELEASE GATE · {report.versionLabel}</span>
          <h2>{report.gate.passed ? '允许进入发布流程' : '阻止发布'}</h2>
          <p>{report.gate.reasons.join(' ')}</p>
        </div>
        <strong>{report.gate.passed ? 'PASSED' : 'BLOCKED'}</strong>
      </section>

      <section className="eval-overview" aria-label="当前版本指标">
        <div><span>综合得分</span><strong data-testid="eval-overall-score">{report.overallScore}<small>/100</small></strong><p>门槛 {report.gate.minimumOverallScore}</p></div>
        <div><span>完整通过</span><strong>{report.passedScenarios}<small>/{report.scenarios.length}</small></strong><p>单样本门槛 {report.gate.minimumScenarioScore}</p></div>
        <div><span>回归样本</span><strong>{report.regressionCount}</strong><p>结果或轨迹存在差异</p></div>
        <div><span>关键违规</span><strong>{report.criticalViolationCount}</strong><p>权限 · 预算 · 副作用</p></div>
      </section>

      <section className="eval-workbench">
        <header className="eval-workbench__header">
          <div><p className="eyebrow">FIXED EVALUATION SET</p><h2>五维样本矩阵</h2></div>
          <p>选择样本，查看每个判定的可复算证据。</p>
        </header>

        <div className="eval-matrix" data-testid="eval-matrix">
          <div className="eval-matrix__heading" aria-hidden="true">
            <span>固定样本</span>
            {dimensionOrder.map((dimension) => <span key={dimension}>{dimensionLabels[dimension]}</span>)}
            <span>得分</span>
          </div>
          {report.scenarios.map((scenario) => (
            <button
              aria-pressed={scenario.scenarioId === selectedScenario.scenarioId}
              className="eval-matrix__row"
              data-testid={scenario.score < 100 ? 'eval-regression-row' : undefined}
              key={scenario.scenarioId}
              onClick={() => setScenarioId(scenario.scenarioId)}
              type="button"
            >
              <span className="eval-matrix__scenario"><small>{scenario.expectedState}</small><strong>{scenario.label}</strong></span>
              {scenario.dimensions.map((dimension) => (
                <span className={dimension.pass ? 'pass' : 'fail'} data-label={dimension.label} key={dimension.id}>
                  {dimension.pass ? <Check size={15} /> : <X size={15} />}
                  <small>{dimension.pass ? '通过' : '失败'}</small>
                </span>
              ))}
              <span className="eval-matrix__score"><strong>{scenario.score}</strong><ArrowRight size={14} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="eval-inspector" aria-live="polite">
        <div className="eval-inspector__brief">
          <p className="eyebrow">SAMPLE INSPECTOR</p>
          <h2>{selectedScenario.label}</h2>
          <div className="eval-state-compare">
            <div><span>预期终态</span><strong>{selectedScenario.expectedState}</strong></div>
            <ArrowRight size={17} />
            <div><span>实际终态</span><strong>{selectedScenario.actualState}</strong></div>
          </div>
          <dl>
            <div><dt>工具步数</dt><dd>{selectedScenario.stepsUsed}/{selectedScenario.maxSteps}</dd></div>
            <div><dt>副作用</dt><dd>{selectedScenario.sideEffects}</dd></div>
            <div><dt>样本得分</dt><dd>{selectedScenario.score}</dd></div>
          </dl>
          {selectedScenario.regressionLocation ? (
            <p className="eval-regression-location"><AlertOctagon size={17} /><span><strong>首个回归位置</strong>{selectedScenario.regressionLocation}</span></p>
          ) : (
            <p className="eval-regression-location eval-regression-location--clean"><CheckCircle2 size={17} /><span><strong>未发现回归</strong>固定轨迹与全部门槛一致。</span></p>
          )}
        </div>

        <div className="eval-inspector__dimensions">
          {selectedScenario.dimensions.map((dimension) => (
            <article className={dimension.pass ? 'pass' : 'fail'} key={dimension.id}>
              <span>{dimension.pass ? <CheckCircle2 size={17} /> : <CircleDot size={17} />}{dimension.label}</span>
              <strong>{dimension.pass ? '通过' : '失败'}</strong>
              <p>{dimension.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
