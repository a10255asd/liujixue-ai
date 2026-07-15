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
  testStrategy: string[]
  deploymentPlan: string[]
  acceptanceChecklist: string[]
  pitchOutline: string[]
  interviewValue: string
  resumeBullet: string
  relatedQuestions: string[]
  deliveryStatus: 'blueprint' | 'prototype' | 'verified'
  evidence: {
    summary: string
    repositoryUrl?: string
    demoPath?: string
    verifiedAt?: string
    commands: string[]
    artifacts: string[]
  }
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
- 如何测试、部署和验收。
- 如何在 3 分钟内讲清目标、架构、难点、测试和结果。
- 面试官会怎么追问。

交付状态不是内容发布状态：`status: published` 只表示这条内容可展示，`deliveryStatus` 才表示项目实现成熟度。

- `blueprint`：只有方案和交付模板，不得出现运行入口或已通过测试的暗示。
- `prototype`：必须提供站内 Demo、验证日期、至少一条验证命令和两项产物证据。
- `verified`：在原型证据上增加真实代码仓库和完整验收记录。
- 未达到 `verified` 时，`resumeBullet` 只能作为完成后的目标表达。

实验室数据放在 `content/labs/`，不并入知识点计数。RAG 原型的文档与评估题分别由页面引擎使用 Zod 校验；文档章节 ID 必须稳定，因为检索评估和引用均以它作为契约。

## 5. 求职路径 CareerGuide

`content/career.json` 是一个带公共审核字段的单例对象：

```ts
type CareerGuide = {
  capabilities: Array<{
    id: string
    order: number
    title: string
    priority: '基础' | '核心' | '加分'
    summary: string
    jdSignals: string[]
    proofPoints: string[]
    knowledgeRefs: string[]
    questionRefs: string[]
    projectRefs: string[]
  }>
  weeks: Array<{
    week: number
    title: string
    focus: string
    deliverables: string[]
    exitCriteria: string[]
    knowledgeRefs: string[]
    questionRefs: string[]
    projectRef: string
  }>
  assessment: Array<{
    id: string
    order: number
    capabilityId: string
    week: number
    statement: string
    actionHref: string
    actionLabel: string
  }>
}
```

能力、周次、自测 order 必须唯一；所有跨内容引用必须在构建时解析成功。自测顺序就是推荐算法的先修顺序，不允许页面自行重排。

## 5A. 实战训练路径 TrainingTrack

`content/training-tracks.json` 只保留 3 条核心交付路径，不用于继续扩张内容数量：

```ts
type TrainingTrack = ContentAuditFields & {
  slug: string
  order: number
  kicker: string
  title: string
  durationWeeks: number
  summary: string
  forWho: string
  prerequisites: string[]
  outcomes: string[]
  tasks: Array<{
    id: string
    title: string
    goal: string
    deliverable: string
    evidence: string[]
    knowledgeRefs: string[]
    questionRefs: string[]
    projectRefs: string[]
  }>
  acceptanceChecklist: string[]
  pitchPrompt: string
}
```

约束：路径 slug 和 order 唯一；同一路径内任务 ID 唯一；每个任务必须同时引用真实知识点、面试题和项目；验收清单至少 4 项。浏览器进度只记录任务复选状态，不代表项目已经验收通过。

## 6. 资料 ResourceLink

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

## 7. 学习日志 LearningJournal

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

## 8. 标签系统

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

## 9. URL 规则

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
