# 刘鸡血 AI 学习知识库

`liujixue-ai` 是计划部署到 `ai.liujixue.cn` 的第三个子站。

定位：

> 给 0 基础开发者，尤其是想转 AI Agent 工程师的人，用一条可执行路线学 AI、做项目、刷面试、准备求职。

当前阶段：Batch 4 求职强化已完成，尚未创建远端仓库和 Vercel 部署。

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
- 静态 JSON 内容数据源 + 构建期 Schema 校验
- Vercel 部署
- 第一版不做登录、不做数据库、不做 AI 生成内容

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
- `/roadmap`：从 0 到 Agent 工程师学习路线。
- `/knowledge`：AI 工程知识库。
- `/agent`：Agent 工程专题地图。
- `/career`：岗位能力矩阵、确定性自测和 8 周求职计划。
- `/interview`：AI 面试题库。
- `/projects`：求职导向的项目实战清单。
- `/resources`：官方文档和高质量资料导航。
- `/journal`：学习日志。

## 边界

- 不承诺“速成大师”，站点表达应落在“从 0 到能独立构建、面试和复盘”。
- 不复制付费课程、书籍或网站长文。
- 不把未经验证的网上说法写成结论。
- 不在第一版接用户系统、收藏、错题本或付费会员。
