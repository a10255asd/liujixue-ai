# 刘鸡血 AI 学习知识库

`liujixue-ai` 是部署在 `ai.liujixue.cn` 的第三个子站。

定位：

> 给 0 基础开发者，尤其是想转 AI Agent 工程师的人，用一条可执行路线学 AI、做项目、刷面试、准备求职。

当前阶段：Batch 8 服务器内容桥接已完成。4 个项目原型、真实 JD 岗位校准与固定模拟面试闭环均可运行；AI 知识库和面试题库已接入 `liujixue-api` 的服务器数据，并保留本地 JSON 兜底；GitHub、Vercel、正式域名和主站入口已接通。

## 必读文档

- [docs/PRODUCT_DESIGN.md](docs/PRODUCT_DESIGN.md)：完整产品设计文档。
- [docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md)：架构、代码组织、内容协议、测试、部署与演进方案。
- [docs/CONTENT_MODEL.md](docs/CONTENT_MODEL.md)：知识点、面试题、项目实战、学习路线数据模型。
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)：分批开发计划和验收标准。
- [docs/PROGRESS_LOG.md](docs/PROGRESS_LOG.md)：已完成内容、验证记录和下一步唯一主线。
- [docs/HANDOFF.md](docs/HANDOFF.md)：给后续 AI agent 的接手说明。
- [docs/REFERENCE_SOURCES.md](docs/REFERENCE_SOURCES.md)：内容来源和官方资料优先级。

## 预期技术栈

- Next.js App Router + TypeScript
- React Server Components
- 静态 JSON 内容数据源 + 服务器知识库 API 数据源，本地 JSON 兜底
- 构建期 Schema 校验
- Vercel 部署
- 阿里云 DNS 记录配置
- 当前子站不做登录、用户系统、收藏、错题本、付费和 AI 生成内容；内容存储与导入由 `liujixue-api` 后端知识库承担

## 本地命令

```bash
nvm use
npm install
npm run dev
npm run validate:content
npm run typecheck
npm run test:unit
npm run lint
npm run build
```

要求 Node.js 20-24，推荐使用仓库 `.nvmrc` 指定的 Node.js 22。

## 第一版目标

- 首页：AI Agent 学习控制台。
- `/tracks`：三条从任务到项目证据和面试表达的实战训练路径，进度保存在本地浏览器。
- `/roadmap`：从 0 到 Agent 工程师学习路线。
- `/knowledge`：AI 工程知识库。
- `/agent`：Agent 工程专题地图。
- `/career`：岗位能力矩阵、确定性自测和 8 周求职计划。
- `/career/calibration`：6 个真实 Agent Engineer JD 的证据覆盖分析和固定 5 题模拟面试。
- `/interview`：AI 面试题库。
- `/projects`：求职导向的项目实战清单。
- `/labs/prompt-regression`：固定夹具驱动的 Prompt 回归原型，比较 Schema、业务规则、延迟和成本。
- `/labs/rag-retrieval`：确定性 RAG 原型，覆盖版本化文档、混合检索、稳定引用、离线评估和未知问题拒答。
- `/labs/controlled-agent`：受控 Agent 状态机原型，覆盖权限、预算、幂等重试、人工审批和轨迹回放。
- `/labs/agent-evaluation`：Agent 评测与发布门禁原型，比较双版本五维轨迹评分并定位样本级回归。
- `/labs/mcp-tools`：最小 MCP server 协议实验，逐帧展示 initialize、tools/list 与 tools/call 的 JSON-RPC 2.0 消息。
- `/resources`：官方文档和高质量资料导航。
- `/journal`：学习日志。

## 边界

- 不承诺“速成大师”，站点表达应落在“从 0 到能独立构建、面试和复盘”。
- 不复制付费课程、书籍或网站长文。
- 不把未经验证的网上说法写成结论。
- 不在第一版接用户系统、收藏、错题本或付费会员。
