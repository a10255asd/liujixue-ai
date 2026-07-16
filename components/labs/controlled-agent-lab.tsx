'use client'

import { AlertTriangle, CheckCircle2, Clock3, KeyRound, Play, RotateCcw, ShieldCheck, Square, UserCheck, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { agentScenarios, evaluateAgentScenarios, runAgentScenario, type AgentState, type ApprovalDecision } from '@/lib/labs/controlled-agent'

const stateLabels: Record<AgentState, string> = {
  planned: '已计划',
  running: '执行中',
  waiting_approval: '等待审批',
  completed: '已完成',
  failed: '已失败',
  budget_exceeded: '预算终止',
  rejected: '审批拒绝'
}

function StateIcon({ state }: { state: AgentState }) {
  if (state === 'completed') return <CheckCircle2 size={18} />
  if (state === 'waiting_approval') return <UserCheck size={18} />
  if (state === 'budget_exceeded') return <Square size={18} />
  if (state === 'failed' || state === 'rejected') return <XCircle size={18} />
  return <Play size={18} />
}

export function ControlledAgentLab() {
  const evaluation = useMemo(evaluateAgentScenarios, [])
  const [scenarioId, setScenarioId] = useState(agentScenarios[0].id)
  const [approval, setApproval] = useState<ApprovalDecision>('pending')
  const run = useMemo(() => runAgentScenario(scenarioId, approval), [scenarioId, approval])

  function selectScenario(id: string) {
    setScenarioId(id)
    setApproval('pending')
  }

  return (
    <div className="agent-lab">
      <section className="agent-lab__summary" aria-label="控制门禁概览">
        <div><strong>{evaluation.scenarioCount}</strong><span>固定轨迹</span></div>
        <div><strong>{Math.round(evaluation.statePassRate * 100)}%</strong><span>终态符合预期</span></div>
        <div><strong>{Math.round(evaluation.budgetPassRate * 100)}%</strong><span>预算守卫通过</span></div>
        <p><ShieldCheck size={18} /> 所有工具调用先经过权限、审批和步数预算；当前执行器只运行仓库内确定性夹具，不连接真实外部工具。</p>
      </section>

      <div className="agent-scenario-tabs" role="tablist" aria-label="执行场景">
        {agentScenarios.map((scenario, index) => (
          <button
            aria-selected={scenario.id === scenarioId}
            key={scenario.id}
            onClick={() => selectScenario(scenario.id)}
            role="tab"
            type="button"
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{scenario.label}</strong>
            <small>{scenario.expectedState}</small>
          </button>
        ))}
      </div>

      <section className="agent-console">
        <div className="agent-console__brief">
          <p className="eyebrow">ACTIVE RUN</p>
          <h2>{run.scenario.label}</h2>
          <p className="agent-console__goal">{run.scenario.goal}</p>

          <div className={`agent-state agent-state--${run.state}`} data-testid="agent-state">
            <StateIcon state={run.state} />
            <div><small>当前终态</small><strong>{stateLabels[run.state]}</strong></div>
          </div>

          <dl className="agent-run-metrics">
            <div><dt>工具步数</dt><dd>{run.stepsUsed} / {run.scenario.maxSteps}</dd></div>
            <div><dt>受控重试</dt><dd>{run.retries}</dd></div>
            <div><dt>副作用提交</dt><dd data-testid="agent-side-effects">{run.sideEffects}</dd></div>
          </dl>

          <div className="agent-policy">
            <div><Clock3 size={16} /><span>达到 {run.scenario.maxSteps} 步立即终止</span></div>
            <div><KeyRound size={16} /><span>{run.scenario.permissions.join(' · ')}</span></div>
            <div><RotateCcw size={16} /><span>重试复用同一幂等键</span></div>
          </div>

          {run.state === 'waiting_approval' ? (
            <div className="agent-approval">
              <div><AlertTriangle size={17} /><p><strong>高风险动作被暂停</strong><span>审批前不会调用删除工具，也不会写入副作用。</span></p></div>
              <div>
                <button className="button button--primary" onClick={() => setApproval('approved')} type="button">批准一次执行</button>
                <button className="button button--secondary" onClick={() => setApproval('rejected')} type="button">拒绝并终止</button>
              </div>
            </div>
          ) : null}

          {run.scenario.category === 'approval' && approval !== 'pending' ? (
            <button className="agent-reset" onClick={() => setApproval('pending')} type="button"><RotateCcw size={15} /> 重置审批状态</button>
          ) : null}
        </div>

        <div className="agent-trace">
          <header><div><p className="eyebrow">EVENT TRACE</p><h2>执行轨迹回放</h2></div><span>{run.events.length} events</span></header>
          <ol data-testid="agent-trace">
            {run.events.map((event) => (
              <li className={`agent-event agent-event--${event.type}`} key={event.sequence}>
                <div className="agent-event__rail"><span>{event.sequence}</span></div>
                <div className="agent-event__body">
                  <div><strong>{event.title}</strong><time>{event.time}</time></div>
                  <p>{event.message}</p>
                  {event.tool ? (
                    <div className="agent-event__meta">
                      <code>{event.tool}</code>
                      {event.attempt ? <span>attempt {event.attempt}</span> : null}
                      {event.idempotencyKey ? <span>{event.idempotencyKey}</span> : null}
                      {event.sideEffectCommitted === true ? <span>effect committed</span> : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}
