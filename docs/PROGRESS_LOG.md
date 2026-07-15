# AI 学习知识库进度日志

更新时间：2026-07-15

本文档只记录已完成、验证结果、当前状态和下一步，供不同 AI agent 无缝接手。产品方向看 `PRODUCT_DESIGN.md`，技术实现看 `TECHNICAL_DESIGN.md`。

## 当前里程碑

状态：Batch 5 已完成 Vercel 生产部署；`ai.liujixue.cn` 已挂到 Vercel 项目，但阿里云 DNS 尚未配置 `ai` CNAME，正式域名仍不可访问。主站入口改动已在 `liujixue-main` 本地验证通过，待 DNS 生效后再发布。

## 已完成

### 2026-07-15：项目设计基线

- 创建 `liujixue-ai` 独立项目和 Git 仓库。
- 完成产品设计、内容模型、实施计划、参考来源和交接文档。
- 完成详细技术设计，确定静态优先、TypeScript、内容仓储层和未来 API 演进方案。

### 2026-07-15：Batch 1 可运行骨架

- 建立 Next.js App Router + TypeScript 严格模式。
- 加入 Zod 内容 Schema、统一仓储层、关系查询和内容校验脚本。
- 补齐 7 个路线阶段、4 个项目、5 个官方资源和首条学习日志。
- 完成首页、路线、知识库、Agent、面试题、项目、资源、日志页面。
- 提前完成知识点、面试题和项目详情页静态生成。
- 完成全局导航、移动端菜单、主站/博客入口、footer、404、robots 和 sitemap。
- 建立高端工程知识库视觉系统，采用中性灰、钢蓝和铜色，避免纯黑按钮和成功绿色主操作。
- 添加 Node 单测、内容引用测试和 Playwright 路由测试基线。

### 2026-07-15：Batch 2 内容与筛选

- 内容扩充为 33 个知识点、80 道面试题、6 个项目和 14 个官方资料。
- 内容覆盖 LLM API、Prompt/Context、RAG、Agent、MCP、Eval、生产与系统设计。
- 所有记录增加 `status`、`lastReviewedAt`、`authors`、`reviewers`；仓储层只发布 `published`。
- 知识库支持关键词、分类、难度筛选。
- 面试题支持关键词、分类、难度、标签筛选。
- 项目支持关键词、难度、技术栈筛选。
- 筛选同步 URL，刷新和分享可恢复；未知参数自动忽略。
- 增加内容规模、审核字段和筛选纯函数测试。

### 2026-07-15：Batch 4 求职强化

- 新增 `/career`，把 8 个 Agent 工程师能力域连接到 JD 信号、证据标准、知识点、面试题和项目。
- 新增 12 项确定性能力自测；得分只来自用户勾选，首个未确认项决定推荐周次和训练入口。
- 新增 8 周执行计划，每周包含交付物、退出标准和关联项目。
- 6 个项目全部补齐测试策略、部署步骤、验收清单和 3 分钟讲解模板，并由 Zod 强制校验。
- 首页、主导航、页脚和 sitemap 增加求职入口。
- 修复 390px 下自测区横向溢出，项目交付区在手机端按单列呈现。

### 2026-07-15：Batch 5 生产部署准备

- 用户明确要求继续部署后，使用 Vercel CLI 发布生产部署。
- Vercel 项目 `liujixue-ai` 已部署 READY，部署 ID：`dpl_518Cn5TQ7VRphxzxhgu3WDxENH9x`。
- 生产部署生成 133 个静态页面。
- Vercel 已给生产部署添加 alias：`https://ai.liujixue.cn`。
- `vercel domains verify ai.liujixue.cn` 返回 `invalid-configuration`，当前 DNS 无 `ai` 记录。
- Vercel 推荐阿里云 DNS 记录：`CNAME ai -> a44989d4bdff19e0.vercel-dns-017.com.`。
- 本机没有阿里云 DNS CLI 或凭据，暂不能自动完成 DNS 配置。
- 为避免主站出现死链，`liujixue-main` 的 AI 学习库入口暂未提交/部署。

## 验证记录

- `validate:content`：通过。
- `typecheck`：通过。
- `lint`：通过。
- Node 单元测试：通过。
- Next.js 生产构建：通过，132 个静态页面生成成功。
- 浏览器桌面验收：1440×900 首页无横向溢出，项目卡片底端一致。
- 浏览器手机验收：390×844 首页、移动导航和长标题详情页无横向溢出。
- 核心路由抽检：8 个首页/列表路由和 3 个详情路由均有正确 H1、title 和主内容。
- Batch 2 浏览器验收：题库 MCP 8 条、MCP 高级 3 条，URL 刷新后恢复。
- 390×844：关键词提交、空状态和双操作按钮可用，无横向溢出。
- 项目页：三行卡片底部链接分别对齐，技术栈筛选正确，控制台无错误。
- Batch 4 Node 单元测试：12 项通过。
- Batch 4 Playwright：桌面与手机共 23 项通过、1 项按项目配置跳过。
- Batch 4 生产构建：通过，133 个静态页面生成成功。
- 生产构建冒烟：`/career` 在 1440px 下输出 8 个能力域和 8 周计划，无横向溢出。
- Batch 5 上线前验证：`validate:content`、12 项单测、`typecheck`、`lint`、`build`、Playwright 23 项通过/1 项跳过。
- Vercel 生产部署验证：远端内容校验、Next.js 编译和 133 个静态页面生成通过。
- 正式域名验证：`https://ai.liujixue.cn` 当前 DNS `ENOTFOUND`，等待阿里云 DNS 增加 CNAME。

## 当前数据规模

- 路线阶段：7。
- 知识点：33。
- 面试题：80。
- 项目：6。
- 官方资料：14。
- 学习日志：1。
- 求职能力域：8。
- 自测项：12。
- 执行周：8。

## 下一步唯一主线

完成 Batch 5 的 DNS 收尾与主站接入：

1. 在阿里云 DNS 为 `liujixue.cn` 增加 `CNAME ai -> a44989d4bdff19e0.vercel-dns-017.com.`。
2. 运行 `vercel domains verify ai.liujixue.cn`，确认配置通过。
3. 验证 `https://ai.liujixue.cn` 首页、核心路由、canonical、robots 和 sitemap。
4. DNS 生效后，在 `liujixue-main` 提交并部署已验证的 AI 学习库入口。
5. 上线后先观察内容使用与求职训练效果，不立即增加账号、数据库和模型调用。

## 不要做

- 暂不做登录、收藏、错题本、付费和数据库。
- 暂不接模型 API 自动生成或评判内容。
- 不为了数量批量生成没有来源、没有工程解释的面试题。
- 不重做当前架构；如需变更，先更新技术设计和本日志。
