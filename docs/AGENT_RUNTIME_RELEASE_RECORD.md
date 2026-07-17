# Agent Runtime 发布记录

更新时间：2026-07-17

本文只记录阶段 6.2B-2B 的线上事实与续接动作。功能设计见 `AGENT_RUNTIME_CANDIDATE.md`，操作细节见 `AGENT_RUNTIME_OPERATIONS.md`。

## 当前生产事实

| 项目 | 结果 |
| --- | --- |
| 生产域名 | `https://ai.liujixue.cn` |
| 最后验证的生产 deployment | `dpl_3r26syMxgjNXgXdd4j2UAj14DaUz` |
| 已验证的 Agent 运行时代码提交 | `c458ef8` |
| 记录建立时的稳定回滚 deployment | `dpl_CiQKaNAyFeTo824QLtXmv85bFgxD` |
| 回滚基线代码提交 | `76c4262` |
| 安全只读冒烟 | 通过，`safeToServe: true` |
| 完整发布门禁 | 通过，`releaseReady: true` |
| 规划器 | `fixture` |
| 限流 | `redis` |
| 运行仓储 | `redis`，完成运行保留 24 小时 |
| 签名身份 | `signed-session` |
| 写工具 | `enabled`，逐次审批 |

以上 deployment 是 2026-07-17 最后一次完整门禁的验证目标，不作为永久固定的线上版本号；后续页面部署可以更新 deployment，但不得跳过同一套发布门禁。

机器可读证据：

- 安全降级历史基线：`docs/evidence/agent-runtime-production-smoke-2026-07-17.json`
- 完整生产门禁：`docs/evidence/agent-runtime-production-release-2026-07-17.json`
- 跨 deployment 恢复：`docs/evidence/agent-runtime-cross-deployment-2026-07-17.json`

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

2026-07-17 账户所有者完成 Marketplace 条款确认后，原创建命令成功完成。当前事实：

- Marketplace installation：`icfg_2CmfGW9WTwCHFpdgLkORTk5u`。
- Redis resource：`store_dMdzN4C6VcNfhYMC`，名称 `liujixue-ai-runtime`，状态 `available`。
- 创建命令使用 `free` 计划并显式传入 `autoUpgrade=false`。
- Redis/KV 环境变量已注入 Production、Preview 和 Development。
- `AGENT_SESSION_SECRET` 已作为 Production Sensitive 变量配置，实际值未写入仓库或证据文件。

资源重建时使用：

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

1. 由账户所有者把 `OPENAI_API_KEY` 配置为 Production Sensitive 变量；不要写进仓库、浏览器或聊天记录。
2. 配置 `AGENT_RUNTIME_MODE=openai` 和明确的 `OPENAI_AGENT_MODEL` 后运行 `npm run check:agent:live`。
3. 预检的 `baselineReady` 与 `productionReady` 都为 `true` 后重新部署。
4. 先运行 `npm run smoke:agent:release`，再执行 `npm run eval:agent:live` 获取 Schema v2 的 20 条真实模型报告。
5. 报告必须达到 20/20，且 request id、Token、成本覆盖率均为 100%；失败样本需保留原始错误边界。
6. 真实报告未全通过、成本基线未记录前，项目继续保持 `prototype`。

## 回滚基线

Redis、身份或模型配置出现异常时，先关闭 `AGENT_RUNTIME_MODE` 并重新部署。若新 deployment 本身异常，回滚到：

```bash
vercel rollback dpl_CiQKaNAyFeTo824QLtXmv85bFgxD --yes
```

回滚后必须重新运行安全只读冒烟，确认 `safeToServe: true`。
