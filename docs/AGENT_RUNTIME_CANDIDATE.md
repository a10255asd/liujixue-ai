# Agent Runtime Verified 候选

更新时间：2026-07-17

本文档是“受控任务执行 Agent”从 `prototype` 走向 `verified` 的专项交接文件。项目总成熟度仍以 `PROJECT_EVIDENCE_AUDIT.md` 为准。

## 当前状态

阶段 6.2B-2A 已完成，6.2B-2B 进行中，但项目仍为 `prototype`：

- 新增 `POST /api/agent/run` 服务端运行入口。
- 新增 `search_knowledge` 与 `inspect_project_evidence` 两个真实只读工具。
- 工具使用严格 JSON Schema、最小权限和最多 4 个工具步。
- 新增 OpenAI Responses API 规划器适配器；生产默认不启用。
- 新增 20 条确定性规划契约评测，夹具通过率为 100%。
- 新增固定窗口 API 限流；Redis 模式使用单次原子脚本计数。
- 新增 24 小时 Redis 运行仓储和单条 `runId` 回放接口。
- 真实模型模式缺少 Redis 持久化限流时会拒绝启动，不允许静默降级。
- 每个工具结果后保存版本化检查点，支持通过 `resumeRunId` 从下一规划轮次继续。
- 客户端预生成 `runId` 并保留失败任务，恢复时先读取已完成结果，再尝试继续检查点。
- 新增 20 条真实模型基线命令，采集精确工具序列、完成率、延迟、Token 和 request id。
- 新增机器可读生产冒烟与发布门禁，覆盖能力探针、同会话回放、跨会话拒绝、审批写入和重复审批拦截。
- 新增服务端 HMAC 签名会话；生产缺少 `AGENT_SESSION_SECRET` 时自动关闭身份相关能力。
- 运行、检查点和学习笔记均按 actor 哈希隔离，跨会话 `runId` 无法回放。
- `RuntimeCheckpoint v2` 支持 `waiting_approval`，写入前暂停并展示精确副作用。
- 新增 `save_learning_note` 写工具；只有 `notes:write` 权限且用户逐次批准后才执行。
- 学习笔记以 `runId + callId` 作为幂等键，重复审批或网络重试不会重复创建。
- 原五类权限、预算、重试、审批和副作用轨迹继续作为安全回归基线。
- 1440px 与 390px 已完成真实浏览器验收，服务端运行返回 2 个工具结果和 8 条事件。

已完成：Vercel Redis、生产签名身份、同会话回放、跨会话拒绝、审批幂等和跨 deployment 恢复。未完成真实模型生产实测与成本基线，因此不得改为 `verified`。

## 目录边界

```text
app/api/agent/run/route.ts              HTTP 输入校验、规划器选择、无缓存响应
components/labs/server-agent-runtime-lab.tsx
                                        浏览器任务输入、审批、工具证据和轨迹展示
content/labs/agent-runtime-evaluation.json
                                        20 条规划契约夹具
lib/agent-runtime/contracts.ts          API、规划器、工具和轨迹类型
lib/agent-runtime/identity.ts           HMAC 签名会话与 Cookie 校验
lib/agent-runtime/tools.ts              严格工具 Schema、权限守卫、真实读取
lib/agent-runtime/planners.ts           确定性规划器与 Responses 适配器
lib/agent-runtime/runner.ts             最多四步的服务端编排循环
lib/agent-runtime/evaluation.ts         规划契约评测
lib/agent-runtime/redis-rest.ts         Upstash/Vercel Redis REST 命令适配
lib/agent-runtime/rate-limit.ts         内存/Redis 固定窗口限流
lib/agent-runtime/storage.ts            响应内/内存/Redis 运行仓储
lib/agent-runtime/baseline.ts           20 条统一基线指标与样本报告
lib/agent-runtime/production-smoke.ts   生产可用性与完整发布门禁
scripts/run-agent-baseline.ts           真实模型基线命令和 JSON 产物
scripts/smoke-agent-production.ts       线上冒烟 CLI 与可选 JSON 留档
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

此时 API 使用 `deterministic-server-planner-v1`；两个只读工具会读取当前内容仓储，写工具仅在签名身份和运行仓储同时可用时开放。

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

三个 Schema 都要求 `additionalProperties: false` 且所有字段必填。不要把用户已经知道的权限或身份字段交给模型填写。

### `save_learning_note`

- 权限：`notes:write`
- 风险：写入，必须逐次人工审批
- 输入：标题与正文；actor 与幂等键由服务端注入，模型不能填写
- 存储：当前 actor 隔离命名空间，幂等键固定为 `runId + callId`
- 生产门禁：同时具备签名身份与 Redis 才开放

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

Redis 已配置时返回 `persistence: redis-24h` 和回放地址；生产未配置 Redis 时必须返回 `response-only`。客户端可携带预生成的 `runId` 创建任务，失败后用 `{ "resumeRunId": "..." }` 从最后一个已确认工具结果继续。等待写入时返回 `202 + waiting_approval`，同一签名会话再提交 `{ "approvalRunId": "...", "decision": "approve|reject" }`。

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
- 54 项单元测试通过，覆盖运行时、身份、隔离、恢复、审批与幂等写入。
- 生产构建通过，存在动态路由 `ƒ /api/agent/run`。
- Playwright 49 项通过、1 项按设备条件跳过。
- 真实浏览器 1440px 与 390px 均无横向溢出。

## 阶段 6.2B-2B 当前验证

- TypeScript 检查通过。
- 单元测试通过，覆盖安全只读冒烟、基础运行时门禁、真实模型门禁、成本快照、独立报告复核和真实证据完整性门禁。
- 桌面与移动浏览器均通过完整写入审批流程；本地 HTTP 与生产 HTTPS 使用匹配协议的 Cookie 安全属性。
- `npm run smoke:agent:production` 在线通过，`safeToServe: true`。
- `npm run smoke:agent:release` 在线通过，`releaseReady: true`；Redis、签名身份、隔离回放和审批幂等全部通过。
- 等待审批的运行从 deployment `dpl_7fySDLCwvvr5Kv7gmKN7CEKXF4o3` 跨部署恢复到 `dpl_6dsZCg1gLtqK8dcxGB85Gzj6EMyt`，批准后只写入一次，重复审批返回 409。
- `npm run eval:agent:live` 在缺少模型密钥时按预期失败，不生成伪造报告。
- `npm run verify:agent:live` 独立复核固定 20 例、工具序列、request id、Token 汇总与成本，截断或篡改报告必须失败。
- 基线报告已升级到 Schema v2；只有 20/20、request id、Token 和成本四项同时完整才允许成为候选。
- 运维与环境变量说明见 `docs/AGENT_RUNTIME_OPERATIONS.md`。
- 当前生产事实、Redis 资源、发布证据和回滚 deployment 见 `docs/AGENT_RUNTIME_RELEASE_RECORD.md`。

## 下一步唯一主线

阶段 6.2B-2B 按以下顺序执行：

1. 账户所有者配置服务端 `OPENAI_API_KEY`；密钥不得进入仓库、浏览器或聊天记录。
2. 本地预检达到 `baselineReady: true` 后，配置 `AGENT_RUNTIME_MODE=openai` 并重新部署；目标模型已预设为 `gpt-5.6-luna`。
3. 运行 `npm run smoke:agent:live`，确认实际部署同时达到 `releaseReady` 与 `liveModelReady`。
4. 把 20 条夹具升级为真实模型基线，采集成功率、工具选择、延迟、Token、成本和 request id，并通过独立复核。
5. 保留失败样本、监控、告警、回滚与线上冒烟记录，再审计是否达到 `verified`。
