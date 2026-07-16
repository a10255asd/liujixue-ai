# Agent Runtime Verified 候选

更新时间：2026-07-16

本文档是“受控任务执行 Agent”从 `prototype` 走向 `verified` 的专项交接文件。项目总成熟度仍以 `PROJECT_EVIDENCE_AUDIT.md` 为准。

## 当前状态

阶段 6.2A 已完成，但项目仍为 `prototype`：

- 新增 `POST /api/agent/run` 服务端运行入口。
- 新增 `search_knowledge` 与 `inspect_project_evidence` 两个真实只读工具。
- 工具使用严格 JSON Schema、最小权限和最多 4 个工具步。
- 新增 OpenAI Responses API 规划器适配器；生产默认不启用。
- 新增 20 条确定性规划契约评测，夹具通过率为 100%。
- 新增固定窗口 API 限流；Redis 模式使用单次原子脚本计数。
- 新增 24 小时 Redis 运行仓储和单条 `runId` 回放接口。
- 真实模型模式缺少 Redis 持久化限流时会拒绝启动，不允许静默降级。
- 原五类权限、预算、重试、审批和副作用轨迹继续作为安全回归基线。
- 1440px 与 390px 已完成真实浏览器验收，服务端运行返回 2 个工具结果和 8 条事件。

未完成：Vercel Redis 实例配置、真实模型生产实测、中断续跑、身份隔离、受审批写工具和成本基线。因此不得改为 `verified`。

## 目录边界

```text
app/api/agent/run/route.ts              HTTP 输入校验、规划器选择、无缓存响应
components/labs/server-agent-runtime-lab.tsx
                                        浏览器任务输入、工具证据和轨迹展示
content/labs/agent-runtime-evaluation.json
                                        20 条规划契约夹具
lib/agent-runtime/contracts.ts          API、规划器、工具和轨迹类型
lib/agent-runtime/tools.ts              严格工具 Schema、权限守卫、真实读取
lib/agent-runtime/planners.ts           确定性规划器与 Responses 适配器
lib/agent-runtime/runner.ts             最多四步的服务端编排循环
lib/agent-runtime/evaluation.ts         规划契约评测
lib/agent-runtime/redis-rest.ts         Upstash/Vercel Redis REST 命令适配
lib/agent-runtime/rate-limit.ts         内存/Redis 固定窗口限流
lib/agent-runtime/storage.ts            响应内/内存/Redis 运行仓储
tests/agent-runtime.test.ts             运行时单元测试
tests/agent-runtime-infrastructure.test.ts
                                        限流、Redis 命令和回放测试
```

不要把模型调用、工具实现或运行状态重新塞进 React 组件。页面只能调用 API 并展示序列化结果。

## 运行模式

默认生产配置不需要密钥：

```text
AGENT_RUNTIME_MODE 未设置
OPENAI_API_KEY 未设置
```

此时 API 使用 `deterministic-server-planner-v1`，但两个工具会真实读取当前内容仓储。

Responses 模式的服务端变量：

```text
AGENT_RUNTIME_MODE=openai
OPENAI_API_KEY=<server-only secret>
OPENAI_AGENT_MODEL=gpt-5.6-luna
```

密钥只能保存在服务端环境。公开域名启用 Responses 模式前，必须先加入身份或持久化限流；当前匿名 API 不允许直接打开付费模型开关。

## 工具契约

### `search_knowledge`

- 权限：`knowledge:read`
- 风险：只读
- 输入：`query` 与 `limit`
- `limit`：1 至 5
- 输出：已发布知识点的 slug、标题、分类、难度、摘要和站内链接

### `inspect_project_evidence`

- 权限：`projects:read`
- 风险：只读
- 输入：项目 `slug`
- 输出：真实 `deliveryStatus`、证据摘要、验证命令、产物与入口

两个 Schema 都要求 `additionalProperties: false` 且所有字段必填。不要把用户已经知道的权限或身份字段交给模型填写。

## API 契约

请求：

```json
{
  "goal": "先查找 Agent 工具权限知识，再检查 task-planning-agent 项目证据"
}
```

`goal` 长度为 8 至 500。响应包含：

- `mode` 与 `model`
- `status`
- `summary`
- `stepsUsed` 与 `maxSteps`
- `observations`
- `trace`
- `usage`
- `persistence`、`replayUrl` 与 `rateLimit`

Redis 已配置时返回 `persistence: redis-24h` 和回放地址；生产未配置 Redis 时必须返回 `response-only`。当前只能回放已完成运行，尚不能从中断步骤继续执行。

## 验证记录

```bash
npm run validate:content
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

2026-07-16 本地结果：

- 内容校验通过。
- TypeScript 与 ESLint 通过。
- 40 项单元测试通过，其中 5 项覆盖新运行时。
- 生产构建通过，存在动态路由 `ƒ /api/agent/run`。
- Playwright 49 项通过、1 项按设备条件跳过。
- 真实浏览器 1440px 与 390px 均无横向溢出。

## 阶段 6.2A 验证

- TypeScript 检查通过。
- 46 项单元测试通过，其中 6 项覆盖 Redis 命令格式、固定窗口限流和运行回放。
- 运维与环境变量说明见 `docs/AGENT_RUNTIME_OPERATIONS.md`。

## 下一步唯一主线

阶段 6.2B 按以下顺序执行：

1. 在 Vercel Marketplace 配置 Upstash Redis，完成生产限流和 24 小时回放冒烟。
2. 配置生产模型密钥，把 20 条夹具升级为真实模型基线；采集成功率、工具选择、延迟、Token、成本和 request id。
3. 将完成后保存升级为逐步骤保存，验证中断后续跑和轨迹重放。
4. 增加身份隔离和一个受审批保护的写工具，验证幂等键、副作用确认和失败补偿。
5. 完成监控、告警、回滚与线上冒烟记录，再审计是否达到 `verified`。
