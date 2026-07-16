# Agent Runtime 运维手册

更新时间：2026-07-16

本文只描述 `POST /api/agent/run` 的生产配置、检查和回滚，不替代功能设计文档。

## 当前生产基线

截至 2026-07-16，Vercel 项目 `liujixue-ai` 未配置环境变量。因此线上行为是：

- 使用确定性服务端规划器。
- 使用进程内固定窗口限流，每实例每个来源标识 12 次/分钟。
- 运行结果只随当前响应返回，不提供生产回放。
- 不调用付费模型，不保存用户任务。

进程内限流只能作为公开夹具模式的基础保护，不能作为真实模型模式的生产限流。

## Redis 配置

在 Vercel Marketplace 为 `liujixue-ai` 添加 Upstash Redis。集成应自动注入：

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

运行时也兼容旧变量名 `KV_REST_API_URL` 与 `KV_REST_API_TOKEN`。标准写 Token 只能放在服务端环境，不能使用 `NEXT_PUBLIC_` 前缀，也不能写入仓库。

配置后重新部署。预期变化：

- 限流模式从 `memory` 变为 `redis`。
- 完成的运行记录保存 24 小时。
- 可通过 `GET /api/agent/run?id=<runId>` 回放单条运行。
- 不提供运行列表接口，`runId` 视为临时访问凭据。

## 真实模型配置

只有 Redis 限流已生效后才允许配置：

```text
AGENT_RUNTIME_MODE=openai
OPENAI_API_KEY=<server-only secret>
OPENAI_AGENT_MODEL=gpt-5.6-luna
```

真实模型模式的限制是每个来源标识 4 次/分钟。缺少模型密钥、Redis 持久化限流未生效或 Redis 不可用时，API 返回 `503`，不得静默降级。

## 冒烟检查

```bash
curl -sS https://ai.liujixue.cn/api/agent/run
curl -i -X POST https://ai.liujixue.cn/api/agent/run \
  -H 'content-type: application/json' \
  -d '{"goal":"检查 task-planning-agent 项目证据"}'
```

检查：

- HTTP 为 `200`。
- 响应包含 `runId`、`status`、`rateLimit` 和 `persistence`。
- 响应头包含 `X-RateLimit-Limit`、`X-RateLimit-Remaining` 和 `X-RateLimit-Reset`。
- Redis 已配置时，`persistence` 为 `redis-24h`，随后用回放接口读取同一个 `runId`。
- Redis 未配置时，生产 `persistence` 必须为 `response-only`。

## 数据边界

- 运行记录包含任务目标、工具参数、工具结果和轨迹，保存期固定为 24 小时。
- 不应提交个人身份信息、客户秘密或生产凭据。
- 当前没有账号隔离；随机 `runId` 是临时访问凭据，不是完整授权模型。
- 上线真实客户任务前必须增加身份认证与租户隔离。

## 回滚

1. 删除或关闭 `AGENT_RUNTIME_MODE=openai`。
2. 重新部署，确认能力接口返回 `plannerMode: fixture`。
3. 保留 Redis 变量可继续使用持久化限流和回放。
4. 若 Redis 本身故障，移除 Redis 环境变量后重新部署；公开夹具模式会退回基础限流与响应内记录。

不得通过把服务端 Token 暴露到浏览器来绕过故障。
