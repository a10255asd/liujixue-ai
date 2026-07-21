# AI Agent 接手说明

更新时间：2026-07-22

## 项目概况

项目：`liujixue-ai`

目标域名：`https://ai.liujixue.cn`

定位：

> 给 0 基础开发者，尤其是想转 AI Agent 工程师的人，用一条可执行路线学 AI、做项目、刷面试、准备求职。

## 当前阶段

当前已完成 Batch 11：完成项目证据审计，交付 Prompt 回归、可评估 RAG、受控 Agent 与 Agent 评测控制台四个原型，并完成 6 个真实 JD 的岗位校准和固定模拟面试。学习路线已扩展为 8 个阶段：新增第 0 阶段 `stage-0-beginner-foundations` 零基础先导，`roadmapStageSchema` 增加可选 `knowledgeRefs` / `questionRefs`，`/roadmap` 将其渲染为有序知识点链接与自测题链接，引用完整性由 `validate:content` 和 `content-relations.test.mjs` 强制。可评估 RAG 实验已升级为三路检索对比（关键词 / 混合 / 向量）：向量模式用本地开源多语言模型（Xenova/multilingual-e5-small，q8），文档向量构建期固化进 `content/labs/rag-vectors.json`，查询向量在浏览器端经 transformers.js 本地生成（模型文件走同源代理，WASM 运行时自托管）；文档内容变化后必须运行 `npm run build:rag-vectors` 重新生成向量，`validate:content` 会通过内容 hash 强制。AI 知识库、面试题库、学习路径集合、面试题组和详情页服务器元数据已接入 `liujixue-api` 服务器知识库，生产构建会合并服务器数据和本地 JSON 兜底内容。6 个项目目前为 4 个 `prototype`、2 个 `blueprint`、0 个 `verified`，页面不会把方案模板写成已完成项目。

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
2. 继续为 AI 站扩充高质量服务器题目，保持本地 JSON 作为兜底和回归样本。
3. 复用 `liujixue-api` 的 `knowledge_site` 模型，为运动学、投资和心理学子站准备内容导入。
4. 给运动学、投资和心理学子站补前端入口与公开页面，继续把高风险内容留在审核流里。
5. 继续完善服务器来源数据，优先给高价值文章和面试题补真实 source 链接。

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
- 完成 Batch 11 服务器详情页增强：`/knowledge/[slug]` 和 `/interview/[id]` 使用详情增强模型读取 `publicId`、topic、tags、sources、发布时间、更新时间、安全等级、建议回答时长、岗位方向和技术标签；无 API 时仍回退本地 JSON。
- Batch 11 验证通过：115 项单元测试、类型检查、Lint、生产构建通过，生成 182 个静态页面；Playwright 59 项通过、1 项按设备条件跳过，`/knowledge/rag-from-zero-to-one` 与 `/interview/llm-temperature-top-p-tradeoffs` 在 1440px 和 390px 下均显示服务器元数据且横向溢出为 0。

2026-07-18：

- 完成 MCP 工具协议实验 `/labs/mcp-tools`：新增 `POST /api/mcp` 最小 MCP server（JSON-RPC 2.0 over HTTP POST 单请求模式），支持 `initialize`、`notifications/initialized`、`ping`、`tools/list`、`tools/call`，零新依赖。
- 协议处理位于 `lib/agent-runtime/mcp.ts`，工具 Schema、权限守卫和执行逻辑全部复用 `lib/agent-runtime/tools.ts` 单一实现；MCP 只暴露 2 个只读工具，`save_learning_note` 不经 MCP 暴露，仍只走站内人工审批通道。
- 页面逐帧展示 initialize → notifications/initialized → tools/list → tools/call 的完整 JSON-RPC 消息轨迹（请求/响应原文、状态码、耗时），并用工程手册风格对比 MCP（协议层标准化）与 function calling（模型能力）的分层关系和适用场景。
- 新增 12 项协议单测；sitemap、README、e2e 路由清单和 `/labs/controlled-agent` 交叉链接已接入。
- 验证：内容校验、类型检查、Lint、79 项单元测试、`next build --turbopack`（152 个静态页面）、Playwright 53 项通过 1 项按设备跳过全部通过；curl 实测 5 个协议方法与全部错误路径（-32700、-32600、-32601、-32602、405、429 限流逻辑）。
- 环境注意：本机所有 Next 项目的 webpack `next build` 当前死锁在一个永不返回的 `open()` 系统调用上（未改动的 liujixue-xuan、liujixue-main 同样复现，与本批改动无关；当时机器交换内存 31.5G/32G 几乎耗尽）；本批构建验证改用 Turbopack 完成。下次在本机构建前若 webpack 仍卡死，先处理机器内存压力或直接在 CI/Vercel 构建。

2026-07-18（学习闭环改造）：

- 完成 `/journal` 与 Agent 学习笔记打通：`lib/agent-runtime/storage.ts` 新增 `listLearningNotes(actorId)`（Redis 走 `SCAN agent:<actor 哈希>:note:*`，内存走 key 前缀过滤，均按 actor 隔离、`createdAt` 倒序）；新增 `GET /api/agent/notes`，只返回当前签名会话 actor 的笔记，复用 30 次/60 秒固定窗口限流。
- 笔记接口降级契约：200 空列表 + `identityMode` / `storageMode` / `reason`（`no-session`、`identity-disabled`、`storage-disabled`）机器可读字段；`/journal` 客户端区块据此区分“还没有笔记”和“当前环境不支持持久化（response-only）”两种空状态。
- 5 个 lab 页底部接入“相关知识点 / 相关面试题”：映射集中声明在 `lib/content/lab-relations.ts`（TS 常量，不进 content/*.json，不影响 `validate:content`），解析走 repository 公开函数，天然只含 `published`。
- 新增 10 项单测（笔记隔离/降级 7 项、lab 映射完整性 3 项），单测总数 89 全部通过；内容校验、typecheck、lint 通过；webpack `next build` 本机死锁仍未恢复，构建验证继续用 `next build --turbopack`（152 静态页）。
- 实测证据：`next start` 下完成 无会话降级 → 发起运行 → 审批 → 真实 Upstash Redis 写入 → 带 Cookie 读回 1 条笔记 的完整闭环；第二会话读取为空；测试 actor 的 note/run/checkpoint 共 5 个 Redis 键已删除，无后台进程残留。
- 注意：`next start` 以 production 模式运行，无 `AGENT_SESSION_SECRET` 时笔记接口返回 `identity-disabled`，这是预期降级；本地联调笔记流程需显式设置该变量。笔记 Redis 读取依赖 SCAN，单 actor 笔记量受 24h TTL 与人工审批约束，量级小，未建索引。

2026-07-18（OTel 可观测性导出）：

- 新增 `lib/agent-runtime/otel.ts` 纯函数 `mapRunToOtelTrace`：把一次 run 的 trace + usage 映射为对齐 OpenTelemetry GenAI 语义约定（open-telemetry/semantic-conventions-genai，Development 状态）的 span 树 JSON。根 span `invoke_agent liujixue-controlled-agent` → 轮次 span（真实模型 `chat <model>` CLIENT；确定性 planner `plan` INTERNAL）→ 工具子 span `execute_tool <tool>`；属性用 `gen_ai.*`，平台事实用 `liujixue.runtime.*`。明确文档化为“结构对齐的 JSON 导出”，非完整 OTLP wire format，零新依赖。
- 关键语义决策：token usage 只聚合在根 span（逐轮拆分属于伪造，trace 不持久化逐轮用量）；确定性模式省略模型/provider/usage 属性而非伪造；审批等待/拒绝 → 工具 span UNSET + span event（approval_requested/approval_rejected）；工具失败 ERROR(_OTHER)、预算拦截 ERROR(budget_exceeded)；跨检查点恢复的调用按 callId 归并同一 span。traceId/spanId 由 runId 经 SHA-256 确定性派生，纳秒用 BigInt。
- 导出通道 `GET /api/agent/run?id=<runId>&format=otel`：复用签名会话授权、回放限流与 actor 隔离（跨会话 404）；未知 format 400；绝对时间用 `storedAt - 最后事件 elapsedMs` 近似锚定。前端轨迹区新增“导出 OTel JSON”按钮（下载 `agent-run-<runId>.otel.json`，response-only 时降级说明）；受控 Agent 页新增 trace → OTel 映射讲解区块。
- 新增 11 项单测（`tests/agent-runtime-otel.test.ts`），单测总数 100 全部通过；validate:content、typecheck、lint 通过；webpack 构建死锁未恢复，继续 `next build --turbopack`（152 静态页）。
- 实测证据：`next start`（需显式 `AGENT_SESSION_SECRET`，production 模式无回退密钥）下完成 fixture 2 工具 run → 同会话回放 200 → `format=otel` 200（6 span 结构校验通过）→ 跨会话回放/导出 404 → 未知 format 400；390px 无横向溢出；3 个测试 run 的 6 个 Redis 键已删除，无后台进程残留。
- 遗留：GenAI 语义约定仍为 Development 状态，`gen_ai.*` 属性名未来可能调整，升级时以 otel.ts 文件头注释的对齐清单为准逐条核对；导出的 JSON 不能被 OTel collector 直接 ingest，接生产后端需用官方 SDK 重新仪表化。

2026-07-18（第 0 阶段入门内容层）：

- 新增 8 个入门知识点（大模型是什么、API 与 API Key、解剖一次模型调用、Prompt 是什么、温度与采样、什么是 Agent、为什么需要 RAG、跑通第一个 AI 应用）与 15 道初级面试题（ai-basic 4、llm-api 6、prompt-context 1、agent 2、rag 2），全部 published，面向完全没碰过 AI API 的读者；术语首次出现均带人话解释，example 字段的最小 JSON/脚本示例经 RichText 代码块渲染。
- 内容关联：知识点经 `relatedQuestions` 同时挂新初级题与现有进阶题（如 `what-is-an-llm` → `token-basics`，`what-is-an-agent` → `agent-loop-control`），`relatedProjects` 只指真实项目；面试题 `projectConnection` 关联到 `/labs/*` 实验或如实标注暂无直接项目关联。
- 未改动项及原因：`roadmap.json` 模型无知识点引用字段且 7 阶段被测试固定，未挂"第 0 阶段"；`lib/content/lab-relations.ts` 主题匹配的 lab 已达 2-4 个引用上限，未置换现有进阶条目；`tests/content-shape.test.mjs` 面试题总数断言 80 → 95 属内容增长的必要基线更新。
- 验证：内容校验、类型检查、Lint、109 项单元测试通过；webpack 构建死锁未恢复（已知环境问题），`next build --turbopack` 通过（175 个静态页面）。
- 注意：本批工作期间检测到另一进程并发修改了 `app/globals.css`、`app/layout.tsx` 并新增 `app/fonts/`（视觉改版，非本批内容），本批提交未包含这些文件。

2026-07-18（路线图全阶段挂载引用）：

- 为 `content/roadmap.json` 原 7 个阶段（order 2-8）补齐 `knowledgeRefs` / `questionRefs`，只新增这两个字段，既有 title/topics/projectRefs/resourceRefs/order 均未动；第 0 阶段 8 个入门知识点未重复引用。
- 匹配严格按各阶段既有 topics：RAG 阶段收编全部 7 个 RAG 知识点，Agent 工程阶段收编全部 7 个 Agent 进阶/高级知识点，MCP 阶段收编全部 3 个 MCP 知识点；33 个非第 0 阶段知识点覆盖率 100%（测试阈值 ≥85%），无知识点跨阶段重复引用。
- 内容缺口（如实记录，未硬凑）：`mcp-ecosystem` 仅 3 个知识点可挂（内容库 MCP 类共 3 个，无 Transport 独立知识点）；`ai-user-basics` 的"非确定性"主题无专属知识点，由自测题 `temperature-and-determinism` 覆盖。
- 测试更新：`tests/content-shape.test.mjs` 删除"其余阶段不应携带 ref"的过期断言，新增"每阶段 knowledgeRefs ≥ 3 / questionRefs ≥ 4 且全部 published"与"33 个非第 0 阶段知识点覆盖率 ≥85%"两个用例，单测总数 113。
- 验证：内容校验、类型检查、Lint、113 项单元测试通过；webpack 构建死锁未恢复（已知环境问题），`next build --turbopack` 通过；`next start` 抽查 `/roadmap`，8 个阶段均渲染 `stage-refs` 区块，抽查知识点/面试题详情链接均 200，server 已关闭无后台进程残留。

2026-07-18（进阶知识点补齐与缺口关闭）：

- 新增 3 个知识点并挂入路线图：`mcp-transports`（stdio 与 Streamable HTTP 的握手、会话、鉴权差异与选型）、`mcp-lifecycle`（initialize 握手、协议版本协商、能力协商、错误码 -32700/-32600/-32601/-32602 与 isError 两层语义）、`llm-determinism`（temperature=0 仍不逐字复现的来源与结构化输出/语义断言对策，衔接入门条目 `temperature-and-sampling`），全部 published。
- 站内事实引用：MCP 两条均引用 `POST /api/mcp`（Streamable HTTP 单请求无状态子集）与 `/labs/mcp-tools`（逐帧协议轨迹）；references 只引 `resources.json` 已有官方条目。
- 路线图：`mcp-ecosystem` knowledgeRefs 重排为 `mcp-architecture` → `mcp-primitives` → `mcp-transports` → `mcp-lifecycle` → `mcp-security`；`ai-user-basics` 在 `model-selection` 后插入 `llm-determinism`；questionRefs 未动。上一批记录的两处内容缺口（MCP Transport 与生命周期、非确定性专属知识点）关闭，非第 0 阶段覆盖率保持 100%。
- 测试基线：`tests/content-shape.test.mjs` 非第 0 阶段知识点池断言 33 → 36，其余断言不变。
- 验证：内容校验（44 知识点）、类型检查、Lint、113 项单元测试通过；webpack 构建死锁未恢复（已知环境问题），`next build --turbopack` 通过（178 静态页）。

2026-07-18（MCP 初级面试题补齐）：

- 新增 4 道 MCP 初级面试题（全部 published、lastReviewedAt 2026-07-18）：`mcp-transport-types`（stdio 与 Streamable HTTP 选型）、`mcp-initialize-handshake`（initialize 握手与协议版本协商）、`mcp-tools-list-call`（tools/list 与 tools/call 及调用五步骤）、`mcp-error-codes`（-32601/-32602 分层排查），与新知识点 `mcp-transports` / `mcp-lifecycle` / `mcp-primitives` 双向关联，站内协议事实逐条对齐 `lib/agent-runtime/mcp.ts`。
- 路线图 `mcp-ecosystem` questionRefs 头部插入 3 道新初级题形成难度梯度，为控制 10 道上限移除与新题覆盖重叠的 `mcp-capability-negotiation`；`mcp-error-codes` 只经知识点关联可达，未挂路线图。
- 测试基线：面试题总数断言 95 → 99；验证：内容校验、类型检查、Lint、113 项单元测试通过；webpack 构建死锁未恢复（已知环境问题），`next build --turbopack` 通过（182 静态页）。
