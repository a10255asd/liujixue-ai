# AI Agent 接手说明

更新时间：2026-07-16

## 项目概况

项目：`liujixue-ai`

目标域名：`https://ai.liujixue.cn`

定位：

> 给 0 基础开发者，尤其是想转 AI Agent 工程师的人，用一条可执行路线学 AI、做项目、刷面试、准备求职。

## 当前阶段

当前已完成 Batch 7 阶段 1 至 5：完成项目证据审计，交付 Prompt 回归、可评估 RAG、受控 Agent 与 Agent 评测控制台四个原型，并完成 6 个真实 JD 的岗位校准和固定模拟面试。6 个项目目前为 4 个 `prototype`、2 个 `blueprint`、0 个 `verified`，页面不会把方案模板写成已完成项目。

GitHub 仓库、Vercel 自动部署、`https://ai.liujixue.cn` 和主站显眼入口均已接通。Vercel 域名验证返回 `ok: true`，当前 CNAME 已是推荐记录。

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

下一批只把“多步骤任务规划 Agent”推进为 `verified` 候选：

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
- 后端服务。

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
- `liujixue-api`：后端服务，第一版 AI 学习库暂不接入。
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
