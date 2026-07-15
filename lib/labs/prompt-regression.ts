import { z } from 'zod'

const supportOutputSchema = z.object({
  category: z.enum(['billing', 'account', 'security', 'product']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  response: z.string().trim().min(12).max(160)
})

type ExpectedOutput = {
  category: z.infer<typeof supportOutputSchema>['category']
  priority: z.infer<typeof supportOutputSchema>['priority']
}

type RegressionSample = {
  id: string
  title: string
  input: string
  expected: ExpectedOutput
  output: unknown
  latencyMs: number
  inputTokens: number
  outputTokens: number
}

type RegressionVersion = {
  id: string
  name: string
  promptSummary: string
  inputPricePerMillion: number
  outputPricePerMillion: number
  samples: RegressionSample[]
}

const cases = [
  {
    id: 'refund-delay',
    title: '退款延迟',
    input: '退款显示成功已经五天，但银行卡还没有到账。',
    expected: { category: 'billing', priority: 'high' } as ExpectedOutput
  },
  {
    id: 'suspicious-login',
    title: '异常登录',
    input: '收到异地登录提醒，不是我本人操作，账号里有企业资料。',
    expected: { category: 'security', priority: 'critical' } as ExpectedOutput
  },
  {
    id: 'password-reset',
    title: '重置密码',
    input: '忘记密码，手机号已经停用，应该如何找回账号？',
    expected: { category: 'account', priority: 'medium' } as ExpectedOutput
  },
  {
    id: 'feature-question',
    title: '功能咨询',
    input: '团队版是否支持导出审计日志？',
    expected: { category: 'product', priority: 'low' } as ExpectedOutput
  }
]

export const regressionVersions: RegressionVersion[] = [
  {
    id: 'baseline',
    name: 'V1 宽松指令',
    promptSummary: '只要求模型判断问题类型并给出回复，没有枚举、优先级规则和输出契约。',
    inputPricePerMillion: 0.4,
    outputPricePerMillion: 1.6,
    samples: [
      { ...cases[0], output: { category: 'billing', priority: 'medium', response: '退款到账时间取决于银行处理，请继续等待。' }, latencyMs: 610, inputTokens: 132, outputTokens: 56 },
      { ...cases[1], output: { category: 'security', response: '请立即修改密码并联系管理员冻结会话。' }, latencyMs: 720, inputTokens: 141, outputTokens: 48 },
      { ...cases[2], output: { category: 'account', priority: 'medium', response: '请通过人工申诉验证身份并更新绑定手机号。' }, latencyMs: 580, inputTokens: 137, outputTokens: 52 },
      { ...cases[3], output: { category: 'product', priority: 'medium', response: '团队版支持部分日志导出，具体范围请查看产品文档。' }, latencyMs: 655, inputTokens: 128, outputTokens: 61 }
    ]
  },
  {
    id: 'contract',
    name: 'V2 契约化指令',
    promptSummary: '加入分类与优先级枚举、判定规则、结构化输出 Schema 和无依据时的回复边界。',
    inputPricePerMillion: 0.4,
    outputPricePerMillion: 1.6,
    samples: [
      { ...cases[0], output: { category: 'billing', priority: 'high', response: '已超过常规到账窗口，请提交退款单号和银行流水，由账务团队优先核查。' }, latencyMs: 690, inputTokens: 214, outputTokens: 72 },
      { ...cases[1], output: { category: 'security', priority: 'critical', response: '请立即冻结当前会话、修改密码并通知企业管理员检查审计日志。' }, latencyMs: 760, inputTokens: 222, outputTokens: 68 },
      { ...cases[2], output: { category: 'account', priority: 'medium', response: '请进入账号申诉流程，通过身份和历史信息验证后更新绑定手机号。' }, latencyMs: 635, inputTokens: 218, outputTokens: 65 },
      { ...cases[3], output: { category: 'product', priority: 'low', response: '团队版支持审计日志导出，实际字段和保留期请以当前版本文档为准。' }, latencyMs: 620, inputTokens: 205, outputTokens: 64 }
    ]
  }
]

function round(value: number, digits = 4) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function evaluateRegressionVersion(version: RegressionVersion) {
  const samples = version.samples.map((sample) => {
    const parsed = supportOutputSchema.safeParse(sample.output)
    const schemaPass = parsed.success
    const businessPass = schemaPass
      && parsed.data.category === sample.expected.category
      && parsed.data.priority === sample.expected.priority
    const issues = schemaPass
      ? [
          ...(parsed.data.category !== sample.expected.category ? [`分类应为 ${sample.expected.category}`] : []),
          ...(parsed.data.priority !== sample.expected.priority ? [`优先级应为 ${sample.expected.priority}`] : [])
        ]
      : parsed.error.issues.map((issue) => `${issue.path.join('.') || 'output'}: ${issue.message}`)
    const estimatedCost = (sample.inputTokens / 1_000_000) * version.inputPricePerMillion
      + (sample.outputTokens / 1_000_000) * version.outputPricePerMillion

    return {
      ...sample,
      output: schemaPass ? parsed.data : sample.output,
      schemaPass,
      businessPass,
      issues,
      estimatedCost: round(estimatedCost, 6)
    }
  })
  const latencies = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b)
  const p95Index = Math.max(0, Math.ceil(latencies.length * 0.95) - 1)

  return {
    id: version.id,
    name: version.name,
    promptSummary: version.promptSummary,
    schemaPassRate: Math.round((samples.filter((sample) => sample.schemaPass).length / samples.length) * 100),
    businessPassRate: Math.round((samples.filter((sample) => sample.businessPass).length / samples.length) * 100),
    p95LatencyMs: latencies[p95Index] ?? 0,
    averageCost: round(samples.reduce((sum, sample) => sum + sample.estimatedCost, 0) / samples.length, 6),
    samples
  }
}

export function getPromptRegressionReports() {
  return regressionVersions.map(evaluateRegressionVersion)
}

export type PromptRegressionReport = ReturnType<typeof evaluateRegressionVersion>
