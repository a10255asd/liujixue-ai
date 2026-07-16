# Agent Runtime 发布记录

更新时间：2026-07-17

本文只记录阶段 6.2B-2B 的线上事实与续接动作。功能设计见 `AGENT_RUNTIME_CANDIDATE.md`，操作细节见 `AGENT_RUNTIME_OPERATIONS.md`。

## 当前生产事实

| 项目 | 结果 |
| --- | --- |
| 生产域名 | `https://ai.liujixue.cn` |
| 记录建立时的稳定回滚 deployment | `dpl_CiQKaNAyFeTo824QLtXmv85bFgxD` |
| 回滚基线代码提交 | `76c4262` |
| 安全只读冒烟 | 通过，`safeToServe: true` |
| 完整发布门禁 | 未通过，`releaseReady: false` |
| 规划器 | `fixture` |
| 限流 | `memory` |
| 运行仓储 | `disabled` |
| 签名身份 | `disabled` |
| 写工具 | `disabled` |

机器可读证据：`docs/evidence/agent-runtime-production-smoke-2026-07-17.json`。

## Redis 配置进度

已确认 Vercel Marketplace 产品为 `upstash/upstash-kv`，目标配置固定为：

```text
plan=free
name=liujixue-ai-runtime
primaryRegion=sin1
eviction=true
autoUpgrade=false
environments=production,preview,development
```

2026-07-17 创建时 Vercel 要求账户所有者在浏览器接受 Upstash Marketplace 条款。AI 未代替用户接受法律条款，因此：

- Marketplace installation 尚未创建。
- Redis resource 尚未创建。
- 项目环境变量仍为空。
- 没有产生费用，也没有开启自动升级。

条款由用户接受后，在项目目录重跑：

```bash
vercel integration add upstash/upstash-kv \
  --plan free \
  --name liujixue-ai-runtime \
  -m primaryRegion=sin1 \
  -m eviction=true \
  -m autoUpgrade=false \
  -e production -e preview -e development \
  --format=json
```

## 监控与告警

- Vercel 已存在团队默认告警规则 `ar_default`。
- 查询过去 24 小时，当前项目无告警组。
- `vercel metrics` 的函数级指标需要付费 Observability Plus；本阶段不升级套餐。
- 零成本监控使用 `npm run smoke:agent:production`，完整发布门禁使用 `npm run smoke:agent:release`。
- 冒烟报告不输出 Cookie、Redis Token 或模型密钥。

## 唯一续接顺序

1. 用户接受 Upstash 条款后重跑免费资源命令。
2. 确认 `vercel env ls` 出现 Redis REST URL 与 Token。
3. 生成至少 32 字节随机值，配置 `AGENT_SESSION_SECRET`，重新部署。
4. 运行 `npm run smoke:agent:release`，必须验证同会话回放、跨会话拒绝、审批前零副作用、批准后单次写入和重复审批拦截。
5. 只有第 4 步通过后才配置 `OPENAI_API_KEY` 与 `AGENT_RUNTIME_MODE=openai`。
6. 执行 `npm run eval:agent:live` 获取 20 条真实模型报告。
7. 真实报告未全通过前，项目继续保持 `prototype`。

## 回滚基线

Redis、身份或模型配置出现异常时，先关闭 `AGENT_RUNTIME_MODE` 并重新部署。若新 deployment 本身异常，回滚到：

```bash
vercel rollback dpl_CiQKaNAyFeTo824QLtXmv85bFgxD --yes
```

回滚后必须重新运行安全只读冒烟，确认 `safeToServe: true`。
