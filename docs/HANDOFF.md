# AI Agent 接手说明

更新时间：2026-07-18

## 项目概况

项目：`liujixue-ai`

目标域名：`https://ai.liujixue.cn`

定位：

> 给 0 基础开发者，尤其是想转 AI Agent 工程师的人，用一条可执行路线学 AI、做项目、刷面试、准备求职。

## 当前阶段

当前已完成 Batch 10：完成项目证据审计，交付 Prompt 回归、可评估 RAG、受控 Agent 与 Agent 评测控制台四个原型，并完成 6 个真实 JD 的岗位校准和固定模拟面试。AI 知识库、面试题库、学习路径集合与面试题组已接入 `liujixue-api` 服务器知识库，生产构建会合并服务器数据和本地 JSON 兜底内容。6 个项目目前为 4 个 `prototype`、2 个 `blueprint`、0 个 `verified`，页面不会把方案模板写成已完成项目。

GitHub 仓库、Vercel 自动部署、`https://ai.liujixue.cn` 和主站显眼入口均已接通。Vercel 域名验证返回 `ok: true`，当前 CNAME 已是推荐记录。用 `vercel inspect ai.liujixue.cn` 获取当前生产部署 ID，不在文档中写死易过期编号。

## 必读顺序

1. `README.md`
2. `docs/PRODUCT_DESIGN.md`
3. `docs/TECHNICAL_DESIGN.md`
4. `docs/CONTENT_MODEL.md`
5. `docs/IMPLEMENTATION_PLAN.md`
6. `docs/PROGRESS_LOG.md`
7. `docs/PROJECT_EVIDENCE_AUDIT.md`
8. `docs/REFERENCE_SOURCES.md`
9. `content/*.json`

## 下一步推荐

内容平台化下一批推荐：

1. 先完善 API 内容后台或导入审核流，避免长期只靠脚本导入。
2. 优化 API 文章和题目详情页渲染，把服务器 `body_md`、标签、来源和题目追问显示得更完整。
3. 继续为 AI 站扩充高质量服务器题目，保持本地 JSON 作为兜底和回归样本。
4. 复用 `liujixue-api` 的 `knowledge_site` 模型，为运动学、投资和心理学子站准备内容导入。
5. 给运动学、投资和心理学子站补前端入口与公开页面，继续把高风险内容留在审核流里。

项目证据化主线仍然是把“多步骤任务规划 Agent”推进为 `verified` 候选：

1. 先读 `PROJECT_EVIDENCE_AUDIT.md` 的五道门禁，不新增项目数量。
2. 接入真实模型规划器和至少两个权限受控的真实工具，同时保留确定性回归夹具。
3. 增加可恢复运行状态、至少 20 条真实任务评测集，以及延迟、Token、成本和关键违规门禁。
4. 完成独立部署、监控、回滚和线上冒烟后，补齐仓库与验收证据。
5. 任何一项未通过都保持 `prototype`；不得用接口代码或本地截图代替 `verified` 证据。

## 内容边界

必须做：

- 学习路线。
- AI 知识点。
- AI 面试题。
- Agent 工程专题。
- 求职导向项目实战。
- 资料导航。

暂时不做：

- 登录。
- 收藏。
- 错题本。
- 付费课程。
- 用户系统。
- AI 自动出题。
- AI 子站内置数据库；服务器内容统一走 `liujixue-api`。

## 写作原则

- 内容要像工程手册，不要像营销软文。
- 每个概念都要说清楚“工程上怎么用”。
- 每道题都要写“考察点、短答案、追问、项目关联”。
- 只有达到 `verified` 的项目才能作为已完成成果写进简历；其他项目只能保留目标表达。
- 优先引用官方文档。
- 不搬运长文，不复制付费课程。

## 视觉原则

- 高端知识库 + 工程手册。
- 克制、清晰、专业。
- 不做夸张科技感。
- 不做大面积紫蓝渐变。
- 不用大量卡片堆叠。
- 不使用纯黑或成功绿色作为默认主按钮。
- 手机端文字不能挤压或溢出。

## 验证命令

```bash
npm run test:unit
npm run validate:content
npm run typecheck
npm run lint
npm run build
```

## 与其他项目关系

- `liujixue-main`：主站，首页、桌面导航、手机菜单、页脚和域名矩阵均直达 `https://ai.liujixue.cn`；`/ai` 保留为站内子站说明页。
- `liujixue-xuan`：玄学工具子站，不要混入 AI 学习内容。
- `liujixue-api`：后端服务，AI 知识库、面试题库、学习路径集合和面试题组已接入其服务器知识库 API；本地 JSON 只作为兜底。
- `NotionNext`：博客，不作为本项目内容源。

## 交接记录

2026-07-15：

- 创建项目目录 `/Users/LIU/Documents/workTable/liujixue-ai`。
- 添加 Next.js 基础配置。
- 添加设计文档、内容模型、实施计划和接手说明。
- 添加详细技术设计，明确静态优先架构、内容仓储层、测试、部署及动态演进边界。
- 添加初始内容种子。
- 完成 TypeScript、Zod 内容校验、仓储层、关系层和测试基线。
- 完成首页、7 个核心页面、3 类详情页、SEO 与响应式 UI。
- 浏览器验证 1440×900 和 390×844，无横向溢出，移动导航可用。
- 完成 Batch 2：33 个知识点、80 道题、6 个项目和 14 个官方资料。
- 三类目录支持关键词、分类、难度、标签或技术栈筛选，状态同步 URL。
- 内容统一增加发布与审核字段，仓储层只返回 `published`。
- 生产构建生成 132 个静态页面；桌面和手机筛选验收无溢出、无控制台错误。
- 完成 Batch 4：新增 `/career`、8 个能力域、12 项确定性自测和 8 周交付计划。
- 6 个项目增加测试策略、部署步骤、验收清单和 3 分钟讲解模板。
- `/career` 桌面和 390px 手机端完成真实浏览器验收，自测递进与项目交付布局正常。
- Batch 4 最终验证：12 项单测通过，Playwright 23 项通过、1 项跳过，生产构建生成 133 个静态页面。
- GitHub 远端仓库已存在：`https://github.com/a10255asd/liujixue-ai.git`。
- Vercel 项目已存在并完成生产部署：`liujixue-ai`，正式域名 alias 指向最新的 READY 生产部署；用 `vercel inspect ai.liujixue.cn` 获取当前部署 ID，不在文档中写死易过期编号。
- Vercel 已将 `https://ai.liujixue.cn` 作为 alias 挂到生产部署并验证通过，`vercel domains verify ai.liujixue.cn` 返回 `ok: true`。
- Vercel 当前记录：`CNAME ai -> a44989d4bdff19e0.vercel-dns-017.com.`；公网解析返回 Vercel 推荐 A 值，个别本地解析器可能短时间缓存旧部署别名。
- 主站已切换到正式 AI 域名；DNS 不再阻塞上线，只需观察个别本地解析缓存是否刷新。
- 完成 Batch 6：新增三条核心训练路径和 7 个证据任务，支持 Hash 直达和本地进度。
- 完成 Batch 7 阶段 1：审计 6 个项目，建立 `blueprint | prototype | verified` 成熟度与证据门禁。
- 新增固定夹具 Prompt 回归原型 `/labs/prompt-regression`；Batch 7 阶段 1 当时为 1 个原型、5 个模板、0 个已验证交付。
- 最终验证：内容校验、类型检查、Lint、15 项单元测试、135 页生产构建通过；Playwright 33 项通过、1 项跳过。
- 完成 RAG 原型 `/labs/rag-retrieval`：8 份手册、16 个章节块、13 条评估题、混合检索、稳定引用和未知问题拒答。
- RAG 最终验证：19 项单元测试、136 页生产构建通过；Playwright 37 项通过、1 项跳过。
- Batch 7 阶段 2 当时更新为 2 个原型、4 个模板、0 个已验证交付，并把受控 Agent 设为下一主线。
- 完成受控 Agent 原型 `/labs/controlled-agent`：五类轨迹、权限与预算守卫、幂等重试、人工审批和事件回放。
- Agent 最终验证：25 项单元测试、137 页生产构建通过；Playwright 41 项通过、1 项跳过。
- 当前项目状态更新为 3 个原型、3 个模板、0 个已验证交付。
- 完成 Agent 评测控制台 `/labs/agent-evaluation`：双版本、五类样本、五维评分、首个回归位置和关键安全发布门禁。
- 评测最终验证：30 项单元测试、138 页生产构建通过；Playwright 45 项通过、1 项跳过；1440px 与 390px 真实浏览器无横向溢出。
- 当前项目状态更新为 4 个原型、2 个模板、0 个已验证交付。
- 完成岗位校准 `/career/calibration`：6 个带来源和日期的真实 JD、8 个能力域证据映射、岗位覆盖率和固定 5 题模拟面试。
- 岗位校准分数与四项自评量表均为确定性计算，不调用模型、不保存答案，也不表示录用概率。
- 下一条唯一主线：按 `PROJECT_EVIDENCE_AUDIT.md` 把“多步骤任务规划 Agent”推进为 `verified` 候选，不增加项目数量。
- 完成 Batch 8 服务器内容桥接：新增 `lib/content/knowledge-api.ts`，`/knowledge`、`/knowledge/[slug]`、`/interview`、`/interview/[id]` 和 `sitemap.xml` 会优先读取 `liujixue-api`，失败时回退本地 JSON。
- 新增受限 Markdown 渲染组件，知识详情和面试答案详情会把服务器正文显示为标题、段落和列表，并用中文分类标签展示。
- 已导入首批服务器 AI 内容：8 道面试题和 4 篇知识文章，生产构建从 139 页增加到 151 页。
- Batch 8 验证通过：内容校验、类型检查、Lint、40 项单元测试、生产构建和正式域名抽检均通过；`/interview/llm-temperature-top-p-tradeoffs` 与 `/knowledge/rag-from-zero-to-one` 已在线可访问。
- 完成 Batch 9 服务器学习路径集合：`/roadmap` 会读取 `learning_path` collections，并展示“AI 应用工程入门路径”的 4 个服务器知识点条目。
- 新增 collection 单元测试，验证列表补详情、只展示 published article 和知识点链接生成。
- 修复 `lib/agent-runtime/baseline.ts` 重复 `releaseCandidate` 字段导致的 TypeScript 报错，保留证据门禁版本的发布候选判断。
- Batch 9 验证通过：内容校验、类型检查、Lint、59 项单元测试、生产构建、1440px 和 390px 路线页浏览器验收均通过。
- Batch 9 已完成 Vercel 生产部署，`https://ai.liujixue.cn/roadmap` 返回 200，并包含“AI 应用工程入门路径”和 4 个服务器知识点。
- API 生产学习路径已扩充为 3 条：AI 应用工程入门路径、RAG 质量闭环路径、Agent 上线治理路径；AI 子站已重新部署，`https://ai.liujixue.cn/roadmap` 正式展示 3 条路径、10 个条目。
- 完成 Batch 10 服务器面试题组：API 生产新增 3 个 `interview_set` collections，`/interview` 顶部会展示 LLM 应用工程、RAG、Agent 可靠性三个题组，共 10 个题组条目。
- Batch 10 验证通过：后端 JSON 和脚本语法通过，AI 子站 67 项单元测试、类型检查、Lint、生产构建通过；1440px 与 390px 本地和正式域名浏览器验收均为 3 个题组、10 个条目、横向溢出 0。
- Batch 10 已完成 Vercel 生产部署，`https://liujixue-a9pz1wzw5-a10255asds-projects.vercel.app` 已 alias 到 `https://ai.liujixue.cn`，`https://ai.liujixue.cn/interview` 返回 200 并展示服务器面试题组。

2026-07-18：

- 完成 MCP 工具协议实验 `/labs/mcp-tools`：新增 `POST /api/mcp` 最小 MCP server（JSON-RPC 2.0 over HTTP POST 单请求模式），支持 `initialize`、`notifications/initialized`、`ping`、`tools/list`、`tools/call`，零新依赖。
- 协议处理位于 `lib/agent-runtime/mcp.ts`，工具 Schema、权限守卫和执行逻辑全部复用 `lib/agent-runtime/tools.ts` 单一实现；MCP 只暴露 2 个只读工具，`save_learning_note` 不经 MCP 暴露，仍只走站内人工审批通道。
- 页面逐帧展示 initialize → notifications/initialized → tools/list → tools/call 的完整 JSON-RPC 消息轨迹（请求/响应原文、状态码、耗时），并用工程手册风格对比 MCP（协议层标准化）与 function calling（模型能力）的分层关系和适用场景。
- 新增 12 项协议单测；sitemap、README、e2e 路由清单和 `/labs/controlled-agent` 交叉链接已接入。
- 验证：内容校验、类型检查、Lint、79 项单元测试、`next build --turbopack`（152 个静态页面）、Playwright 53 项通过 1 项按设备跳过全部通过；curl 实测 5 个协议方法与全部错误路径（-32700、-32600、-32601、-32602、405、429 限流逻辑）。
- 环境注意：本机所有 Next 项目的 webpack `next build` 当前死锁在一个永不返回的 `open()` 系统调用上（未改动的 liujixue-xuan、liujixue-main 同样复现，与本批改动无关；当时机器交换内存 31.5G/32G 几乎耗尽）；本批构建验证改用 Turbopack 完成。下次在本机构建前若 webpack 仍卡死，先处理机器内存压力或直接在 CI/Vercel 构建。
