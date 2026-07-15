const categoryLabels: Record<string, string> = {
  'ai-basic': 'AI 基础',
  llm: 'LLM',
  'llm-api': 'LLM API',
  prompt: 'Prompt',
  'prompt-context': '上下文工程',
  rag: 'RAG',
  agent: 'Agent',
  mcp: 'MCP',
  framework: '框架',
  eval: '评估',
  'eval-observability': '评估与观测',
  deploy: '部署',
  'deploy-cost': '部署与成本',
  security: '安全',
  career: '求职',
  'system-design': '系统设计',
  coding: '编码',
  behavior: '行为面试',
  'project-review': '项目复盘'
}

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] ?? category
}

export function sortChinese(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}
