# 内容模型设计

更新时间：2026-07-15

本项目第一版采用静态内容数据源。建议放在 `content/` 或 `lib/content-data.js`，后续需要搜索和编辑后台时再迁移到数据库。

## 0. 公共审核字段

所有内容记录都必须包含以下字段，仓储层只向页面返回 `published` 内容：

```ts
type ContentAuditFields = {
  status: 'draft' | 'reviewed' | 'published'
  lastReviewedAt: string
  sourceUpdatedAt?: string
  authors: string[]
  reviewers: string[]
}
```

Batch 2 已移除旧数据兼容逻辑。缺少审核字段、知识点或面试题缺少官方资料引用时，构建直接失败。

## 1. 学习路线 Roadmap

```ts
type RoadmapStage = {
  slug: string
  title: string
  order: number
  level: '入门' | '进阶' | '高级' | '求职'
  summary: string
  goals: string[]
  prerequisites: string[]
  topics: string[]
  outputs: string[]
  interviewFocus: string[]
  projectRefs: string[]
  resourceRefs: string[]
}
```

示例：

```json
{
  "slug": "llm-api",
  "title": "LLM API 开发",
  "order": 2,
  "level": "入门",
  "summary": "学会把大模型作为一个可控的工程依赖调用。",
  "goals": ["完成一次文本生成调用", "理解结构化输出", "理解流式响应"],
  "prerequisites": ["理解 Token 和上下文"],
  "topics": ["模型参数", "JSON 输出", "错误重试", "成本控制"],
  "outputs": ["Prompt 调试器"],
  "interviewFocus": ["如何保证 LLM 输出稳定", "如何处理超时和重试"],
  "projectRefs": ["prompt-debugger"],
  "resourceRefs": ["openai-platform-docs"]
}
```

## 2. 知识点 KnowledgePoint

```ts
type KnowledgePoint = {
  slug: string
  title: string
  category:
    | 'ai-basic'
    | 'llm'
    | 'prompt'
    | 'rag'
    | 'agent'
    | 'mcp'
    | 'eval'
    | 'deploy'
    | 'security'
    | 'career'
  level: '入门' | '进阶' | '高级'
  summary: string
  whyItMatters: string
  explanation: string
  engineeringNotes: string[]
  example: string
  commonMistakes: string[]
  interviewAnswer: string
  relatedQuestions: string[]
  relatedProjects: string[]
  references: string[]
}
```

详情页必须展示：

- 一句话解释。
- 为什么重要。
- 工程实现方式。
- 常见误区。
- 面试怎么说。
- 关联项目。
- 参考资料。

## 3. 面试题 InterviewQuestion

```ts
type InterviewQuestion = {
  id: string
  question: string
  category:
    | 'ai-basic'
    | 'llm-api'
    | 'prompt-context'
    | 'rag'
    | 'agent'
    | 'mcp'
    | 'framework'
    | 'eval-observability'
    | 'deploy-cost'
    | 'system-design'
    | 'coding'
    | 'behavior'
    | 'project-review'
  level: '初级' | '中级' | '高级'
  tags: string[]
  whatItTests: string[]
  shortAnswer: string
  fullAnswer: string
  bonusPoints: string[]
  commonMistakes: string[]
  followUps: string[]
  projectConnection: string
  references: string[]
}
```

题目详情页必须展示：

- 题目。
- 难度。
- 考察点。
- 短答案。
- 完整答案。
- 加分回答。
- 常见错误。
- 追问。
- 如何结合项目回答。
- 参考资料。

## 4. 项目实战 PracticalProject

```ts
type PracticalProject = {
  slug: string
  title: string
  level: '入门' | '进阶' | '高级'
  summary: string
  targetUser: string
  stack: string[]
  features: string[]
  architecture: string
  implementationSteps: string[]
  hardParts: string[]
  interviewValue: string
  resumeBullet: string
  relatedQuestions: string[]
  demoUrl?: string
  githubUrl?: string
}
```

项目详情必须能回答：

- 这个项目解决什么问题。
- 为什么适合写进简历。
- 技术栈是什么。
- 核心架构是什么。
- 难点在哪里。
- 面试官会怎么追问。

## 5. 资料 ResourceLink

```ts
type ResourceLink = {
  id: string
  title: string
  sourceType: 'official-doc' | 'paper' | 'example' | 'course' | 'blog' | 'repo'
  category: string
  url: string
  summary: string
  recommendedFor: string[]
  priority: 1 | 2 | 3
}
```

资料导航排序规则：

1. 官方文档优先。
2. 可运行示例优先。
3. 与当前路线阶段相关优先。

## 6. 学习日志 LearningJournal

```ts
type LearningJournal = {
  slug: string
  title: string
  date: string
  stage: string
  learned: string[]
  blockers: string[]
  solved: string[]
  artifacts: string[]
  interviewTakeaways: string[]
  nextActions: string[]
}
```

日志不是日记，应服务学习和求职：

- 今天学了什么。
- 卡在哪里。
- 解决了什么。
- 产出了什么。
- 能转成哪道面试题。
- 下一步做什么。

## 7. 标签系统

建议基础标签：

```text
LLM
Prompt
Context
RAG
Embedding
Vector DB
Agent
Tool Calling
MCP
LangGraph
Vercel AI SDK
Eval
Observability
Deployment
Cost
Interview
Resume
```

## 8. URL 规则

- 知识点：`/knowledge/[slug]`
- 面试题：`/interview/[id]`
- 项目：`/projects/[slug]`
- 日志：`/journal/[slug]`

slug 使用英文小写和短横线。

示例：

- `what-is-rag`
- `agent-tool-calling`
- `mcp-server-client`
- `rag-vs-fine-tuning`
