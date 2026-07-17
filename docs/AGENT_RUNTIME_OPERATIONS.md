# Agent Runtime 运维手册

更新时间：2026-07-17

本文只描述 `POST /api/agent/run` 的生产配置、检查和回滚，不替代功能设计文档。

## 当前生产基线

截至 2026-07-16，Vercel 项目 `liujixue-ai` 未配置环境变量。因此线上行为是：

- 使用确定性服务端规划器。
- 使用进程内固定窗口限流，每实例每个来源标识 12 次/分钟。
- 运行结果只随当前响应返回，不提供生产回放。
- 不调用付费模型，不保存用户任务。
- 未配置签名会话，生产只开放只读夹具，不开放学习笔记写入。

进程内限流只能作为公开夹具模式的基础保护，不能作为真实模型模式的生产限流。

## Redis 配置

在 Vercel Marketplace 为 `liujixue-ai` 添加 Upstash Redis。集成应自动注入：

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

运行时也兼容旧变量名 `KV_REST_API_URL` 与 `KV_REST_API_TOKEN`。标准写 Token 只能放在服务端环境，不能使用 `NEXT_PUBLIC_` 前缀，也不能写入仓库。

同时生成至少 32 字节的随机签名密钥并仅配置在服务端：

```text
AGENT_SESSION_SECRET=<至少 32 字节随机值>
```

配置后重新部署。预期变化：

- 限流模式从 `memory` 变为 `redis`。
- 完成的运行记录保存 24 小时。
- 可通过 `GET /api/agent/run?id=<runId>` 回放单条运行。
- 每个工具结果后按 actor 隔离保存检查点；客户端可通过 `resumeRunId` 从下一轮继续。
- 回放、续跑和审批都必须携带同一个 HttpOnly 签名会话 Cookie。
- `save_learning_note` 写入前返回 `waiting_approval`，批准后按幂等键提交一次。
- 不提供运行列表接口，`runId` 不能替代签名会话授权。

## 真实模型配置

只有 Redis 限流和签名身份都已生效后才允许配置：

```text
AGENT_RUNTIME_MODE=openai
OPENAI_API_KEY=<server-only secret>
OPENAI_AGENT_MODEL=gpt-5.6-luna
```

真实模型模式的限制是每个来源标识 4 次/分钟。缺少模型密钥、Redis 持久化限流未生效或 Redis 不可用时，API 返回 `503`，不得静默降级。

默认 `gpt-5.6-luna` 用于高频、成本敏感基线；请求固定使用标准服务层，并发送当前签名会话生成的无个人信息 `safety_identifier`。模型选择与价格来源见 [OpenAI 模型文档](https://developers.openai.com/api/docs/models/gpt-5.6-luna)。

配置完成后运行真实模型基线：

```bash
npm run eval:agent:live
```

默认报告写入 `artifacts/agent-runtime/openai-baseline.json`。缺少 `OPENAI_API_KEY` 时命令必须失败。报告 Schema v2 固定记录：

- 20 条样本的精确工具序列、状态、延迟和失败原因。
- input、cached input、cache write、output、reasoning 与 total Token。
- 每条请求的 OpenAI request id 覆盖率。
- 按模型价格快照计算的逐样本和总美元成本，包含缓存写入 1.25 倍费率。
- 价格快照的日期、适用范围和官方来源 URL。

只有 20 条全部通过、request id 覆盖率 100%、Token 覆盖率 100%、成本覆盖率 100% 时才标记 `releaseCandidate: true`。未知模型没有受审价格快照时必须失败关闭，不能估算成零成本。

## 冒烟检查

首选机器可读命令：

```bash
# 当前公开服务可用性；允许安全只读模式
npm run smoke:agent:production

# 完整发布门禁；Redis、签名身份、隔离回放和审批写入必须全部通过
npm run smoke:agent:release

# 需要留档时显式指定输出位置
AGENT_SMOKE_OUTPUT=docs/evidence/agent-runtime-production-smoke-YYYY-MM-DD.json \
  npm run smoke:agent:production
```

完整发布门禁会验证同会话回放、跨会话拒绝、审批前零副作用、批准后单次写入和重复审批拦截。报告不得包含 Cookie 或服务端凭据。

手工检查可使用：

```bash
COOKIE_JAR="$(mktemp)"
curl -sS -c "$COOKIE_JAR" https://ai.liujixue.cn/api/agent/run
curl -i -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST https://ai.liujixue.cn/api/agent/run \
  -H 'content-type: application/json' \
  -d '{"goal":"检查 task-planning-agent 项目证据"}'
```

检查：

- HTTP 为 `200`。
- 能力响应在三项生产变量齐全时包含 `identityMode: signed-session`、`storageMode: redis` 与 `writeToolsEnabled: true`。
- 响应包含 `runId`、`status`、`rateLimit` 和 `persistence`。
- 响应头包含 `X-RateLimit-Limit`、`X-RateLimit-Remaining` 和 `X-RateLimit-Reset`。
- Redis 已配置时，`persistence` 为 `redis-24h`，随后用回放接口读取同一个 `runId`。
- 模拟中断后使用 `POST { "resumeRunId": "<runId>" }`，确认轨迹包含 `run_resumed` 且已成功工具没有重复执行。
- 请求“保存成学习笔记”，确认先返回 HTTP `202` 与 `waiting_approval`；批准前没有 `save_learning_note` 观察结果，批准后只有一条且 `created: true`。
- 换一个空 Cookie Jar 回放原 `runId`，必须返回 `404`，不得泄露其他会话记录。
- Redis 未配置时，生产 `persistence` 必须为 `response-only`。

## 数据边界

- 运行记录包含任务目标、工具参数、工具结果和轨迹，保存期固定为 24 小时。
- 不应提交个人身份信息、客户秘密或生产凭据。
- 当前是匿名签名会话隔离，不是实名账号系统；清除 Cookie 后无法找回原会话记录。
- Redis key 只保存 actor 哈希，不保存原始会话 Token；Cookie 使用 HttpOnly、SameSite=Lax，HTTPS 下使用 Secure。
- 上线真实客户任务前仍需接入正式登录、租户成员关系和数据删除流程。

## 回滚

1. 删除或关闭 `AGENT_RUNTIME_MODE=openai`。
2. 重新部署，确认能力接口返回 `plannerMode: fixture`。
3. 保留 Redis 变量可继续使用持久化限流和回放。
4. 若 Redis 本身故障，移除 Redis 环境变量后重新部署；公开夹具模式会退回基础限流与响应内记录。

不得通过把服务端 Token 暴露到浏览器来绕过故障。

## 监控边界

- 使用 `vercel alerts --project liujixue-ai --since 24h --format json` 检查告警组。
- 使用 `vercel alerts rules ls --format json` 检查默认告警规则。
- 当前账户的函数级 `vercel metrics` 需要 Observability Plus；未明确批准付费升级前不启用。
- 零成本持续检查以 `npm run smoke:agent:production` 为准，发布前以 `npm run smoke:agent:release` 为准。
- 当前线上证据和精确续接步骤见 `docs/AGENT_RUNTIME_RELEASE_RECORD.md`。
