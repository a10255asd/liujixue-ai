import { z } from 'zod'

export const agentStateSchema = z.enum([
  'planned',
  'running',
  'waiting_approval',
  'completed',
  'failed',
  'budget_exceeded',
  'rejected'
])

export type AgentState = z.infer<typeof agentStateSchema>
export type ApprovalDecision = 'pending' | 'approved' | 'rejected'

type ToolContract = {
  name: string
  label: string
  permission: string
  risk: 'read' | 'write' | 'high'
  retryLimit: number
  idempotent: boolean
}

type ScenarioAction = {
  id: string
  tool: keyof typeof toolContracts
  instruction: string
  failuresBeforeSuccess?: number
  fatalMessage?: string
  repeatUntilBudget?: boolean
  requiresApproval?: boolean
}

type AgentScenario = {
  id: string
  label: string
  category: 'success' | 'retry' | 'permission' | 'budget' | 'approval'
  goal: string
  expectedState: AgentState
  maxSteps: number
  permissions: string[]
  actions: ScenarioAction[]
}

export type TraceEvent = {
  sequence: number
  time: string
  state: AgentState
  type: 'plan' | 'tool_call' | 'tool_result' | 'retry' | 'approval' | 'transition' | 'guard'
  title: string
  message: string
  tool?: string
  idempotencyKey?: string
  attempt?: number
  sideEffectCommitted?: boolean
}

const toolContracts = {
  read_metrics: {
    name: 'read_metrics', label: '读取业务指标', permission: 'metrics:read', risk: 'read', retryLimit: 0, idempotent: true
  },
  render_report: {
    name: 'render_report', label: '生成周报草稿', permission: 'report:render', risk: 'read', retryLimit: 0, idempotent: true
  },
  save_draft: {
    name: 'save_draft', label: '保存周报草稿', permission: 'report:write', risk: 'write', retryLimit: 1, idempotent: true
  },
  fetch_incidents: {
    name: 'fetch_incidents', label: '读取故障记录', permission: 'incident:read', risk: 'read', retryLimit: 2, idempotent: true
  },
  export_payroll: {
    name: 'export_payroll', label: '导出薪资明细', permission: 'payroll:export', risk: 'high', retryLimit: 0, idempotent: false
  },
  check_dependency: {
    name: 'check_dependency', label: '检查外部依赖', permission: 'dependency:read', risk: 'read', retryLimit: 99, idempotent: true
  },
  delete_exports: {
    name: 'delete_exports', label: '删除过期导出文件', permission: 'storage:delete', risk: 'high', retryLimit: 1, idempotent: true
  }
} as const satisfies Record<string, ToolContract>

export const agentScenarios: AgentScenario[] = [
  {
    id: 'clean-success',
    label: '正常完成',
    category: 'success',
    goal: '读取本周业务指标，生成周报并保存为草稿。',
    expectedState: 'completed',
    maxSteps: 5,
    permissions: ['metrics:read', 'report:render', 'report:write'],
    actions: [
      { id: 'metrics', tool: 'read_metrics', instruction: '读取本周业务指标' },
      { id: 'render', tool: 'render_report', instruction: '将指标组织成周报' },
      { id: 'save', tool: 'save_draft', instruction: '保存周报草稿' }
    ]
  },
  {
    id: 'retry-recovery',
    label: '临时故障恢复',
    category: 'retry',
    goal: '读取故障记录并保存复盘草稿，读取超时后按策略恢复。',
    expectedState: 'completed',
    maxSteps: 5,
    permissions: ['incident:read', 'report:write'],
    actions: [
      { id: 'incidents', tool: 'fetch_incidents', instruction: '读取本周故障记录', failuresBeforeSuccess: 1 },
      { id: 'save', tool: 'save_draft', instruction: '保存故障复盘草稿' }
    ]
  },
  {
    id: 'permission-denied',
    label: '越权调用拦截',
    category: 'permission',
    goal: '导出全员薪资明细并发送给项目成员。',
    expectedState: 'failed',
    maxSteps: 4,
    permissions: ['report:write'],
    actions: [
      { id: 'payroll', tool: 'export_payroll', instruction: '导出薪资明细', fatalMessage: '当前执行身份缺少 payroll:export 权限' }
    ]
  },
  {
    id: 'step-budget',
    label: '步数预算终止',
    category: 'budget',
    goal: '等待外部依赖恢复后继续任务。',
    expectedState: 'budget_exceeded',
    maxSteps: 3,
    permissions: ['dependency:read'],
    actions: [
      { id: 'dependency', tool: 'check_dependency', instruction: '检查外部依赖是否恢复', repeatUntilBudget: true }
    ]
  },
  {
    id: 'human-approval',
    label: '高风险人工审批',
    category: 'approval',
    goal: '删除 30 天前的过期导出文件。',
    expectedState: 'waiting_approval',
    maxSteps: 3,
    permissions: ['storage:delete'],
    actions: [
      { id: 'delete', tool: 'delete_exports', instruction: '删除过期导出文件', requiresApproval: true }
    ]
  }
]

function createEventFactory(events: TraceEvent[]) {
  return (event: Omit<TraceEvent, 'sequence' | 'time'>) => {
    const sequence = events.length + 1
    events.push({
      ...event,
      sequence,
      time: `T+${String((sequence - 1) * 120).padStart(4, '0')}ms`
    })
  }
}

export function runAgentScenario(scenarioId: string, approval: ApprovalDecision = 'pending') {
  const scenario = agentScenarios.find((item) => item.id === scenarioId)
  if (!scenario) throw new Error(`Unknown agent scenario: ${scenarioId}`)

  const events: TraceEvent[] = []
  const pushEvent = createEventFactory(events)
  let state: AgentState = 'planned'
  let stepsUsed = 0
  let retries = 0
  let sideEffects = 0

  pushEvent({ state, type: 'plan', title: '计划已创建', message: `拆分为 ${scenario.actions.length} 个受控动作，最大工具步数 ${scenario.maxSteps}。` })
  state = 'running'
  pushEvent({ state, type: 'transition', title: '进入执行', message: '状态从 planned 转为 running。' })

  for (const action of scenario.actions) {
    const contract = toolContracts[action.tool]
    const idempotencyKey = `${scenario.id}:${action.id}`

    if (!scenario.permissions.includes(contract.permission)) {
      state = 'failed'
      pushEvent({
        state,
        type: 'guard',
        title: '权限守卫拒绝调用',
        message: action.fatalMessage ?? `缺少 ${contract.permission} 权限。`,
        tool: contract.name,
        idempotencyKey
      })
      break
    }

    if (action.requiresApproval) {
      if (approval === 'pending') {
        state = 'waiting_approval'
        pushEvent({ state, type: 'approval', title: '等待人工审批', message: `${contract.label}属于高风险副作用，执行前必须确认。`, tool: contract.name, idempotencyKey })
        break
      }
      if (approval === 'rejected') {
        state = 'rejected'
        pushEvent({ state, type: 'approval', title: '审批已拒绝', message: '任务终止，未调用高风险工具。', tool: contract.name, idempotencyKey })
        break
      }
      pushEvent({ state, type: 'approval', title: '审批已通过', message: '允许执行一次受幂等键保护的删除操作。', tool: contract.name, idempotencyKey })
    }

    let attempt = 0
    const failureCount = action.repeatUntilBudget ? Number.POSITIVE_INFINITY : (action.failuresBeforeSuccess ?? 0)

    while (true) {
      if (stepsUsed >= scenario.maxSteps) {
        state = 'budget_exceeded'
        pushEvent({ state, type: 'guard', title: '步数预算耗尽', message: `已使用 ${stepsUsed}/${scenario.maxSteps} 个工具步，控制器阻止继续调用。`, tool: contract.name, idempotencyKey })
        break
      }

      attempt += 1
      stepsUsed += 1
      pushEvent({ state, type: 'tool_call', title: contract.label, message: action.instruction, tool: contract.name, idempotencyKey, attempt })

      if (attempt <= failureCount) {
        pushEvent({ state, type: 'tool_result', title: '工具返回临时错误', message: 'UPSTREAM_TIMEOUT：未提交任何副作用。', tool: contract.name, idempotencyKey, attempt, sideEffectCommitted: false })
        if (stepsUsed >= scenario.maxSteps) continue
        if (attempt > contract.retryLimit) {
          state = 'failed'
          pushEvent({ state, type: 'guard', title: '重试次数耗尽', message: `超过 ${contract.retryLimit} 次重试上限。`, tool: contract.name, idempotencyKey })
          break
        }
        retries += 1
        pushEvent({ state, type: 'retry', title: '进入受控重试', message: `复用幂等键，准备第 ${attempt + 1} 次调用。`, tool: contract.name, idempotencyKey, attempt: attempt + 1 })
        continue
      }

      const sideEffectCommitted = contract.risk !== 'read'
      if (sideEffectCommitted) sideEffects += 1
      pushEvent({ state, type: 'tool_result', title: '工具执行成功', message: sideEffectCommitted ? '副作用已提交一次并写入事件日志。' : '只读结果已写入状态。', tool: contract.name, idempotencyKey, attempt, sideEffectCommitted })
      break
    }

    if (state !== 'running') break
  }

  if (state === 'running') {
    state = 'completed'
    pushEvent({ state, type: 'transition', title: '任务完成', message: '所有计划动作完成，控制器停止循环。' })
  }

  return {
    scenario,
    approval,
    state,
    stepsUsed,
    retries,
    sideEffects,
    events,
    withinBudget: stepsUsed <= scenario.maxSteps,
    expectedStateMatched: approval === 'pending' ? state === scenario.expectedState : true
  }
}

export function evaluateAgentScenarios() {
  const runs = agentScenarios.map((scenario) => runAgentScenario(scenario.id))
  return {
    scenarioCount: runs.length,
    statePassRate: runs.filter((run) => run.expectedStateMatched).length / runs.length,
    budgetPassRate: runs.filter((run) => run.withinBudget).length / runs.length,
    permissionBlocks: runs.filter((run) => run.events.some((event) => event.title === '权限守卫拒绝调用')).length,
    approvalGates: runs.filter((run) => run.state === 'waiting_approval').length,
    runs
  }
}

export type AgentRun = ReturnType<typeof runAgentScenario>
