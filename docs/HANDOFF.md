# AI Agent 接手说明

更新时间：2026-07-15

## 项目概况

项目：`liujixue-ai`

目标域名：`https://ai.liujixue.cn`

定位：

> 给 0 基础开发者，尤其是想转 AI Agent 工程师的人，用一条可执行路线学 AI、做项目、刷面试、准备求职。

## 当前阶段

当前已完成 Batch 5 的 Vercel 生产部署准备：设计与技术骨架、全部核心页面和详情页、33 个知识点、80 道面试题、6 个项目、14 个官方资料入口，以及 8 个求职能力域、12 项自测和 8 周计划均已上线到 Vercel 项目。

用户已在 2026-07-15 明确要求继续部署；Vercel 生产部署已 READY，但正式域名仍被阿里云 DNS 阻塞。

## 必读顺序

1. `README.md`
2. `docs/PRODUCT_DESIGN.md`
3. `docs/TECHNICAL_DESIGN.md`
4. `docs/CONTENT_MODEL.md`
5. `docs/IMPLEMENTATION_PLAN.md`
6. `docs/PROGRESS_LOG.md`
7. `docs/REFERENCE_SOURCES.md`
8. `content/*.json`

## 下一步推荐

下一批是完成 Batch 5 的 DNS 收尾与主站接入：

1. 在阿里云 DNS 为 `liujixue.cn` 增加 `CNAME ai -> a44989d4bdff19e0.vercel-dns-017.com.`。
2. 运行 `vercel domains verify ai.liujixue.cn`，确认 Vercel 域名配置通过。
3. 验证 `https://ai.liujixue.cn` 的首页、canonical、robots、sitemap 和核心页面。
4. DNS 生效后，把 `liujixue-main` 的 `siteProfile.ai` 从临时 Vercel alias 切回 `https://ai.liujixue.cn` 并部署。
5. 不增加登录、收藏、模型调用或数据库。

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
- 每个项目都要能写进简历。
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

- `liujixue-main`：主站，已提交 AI 学习库入口；正式域名未解析前入口临时指向 `https://liujixue-ai.vercel.app`。
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
- Vercel 项目已存在并完成生产部署：`liujixue-ai`，部署 `dpl_518Cn5TQ7VRphxzxhgu3WDxENH9x` READY。
- Vercel 已将 `https://ai.liujixue.cn` 作为 alias 挂到生产部署，但 DNS 当前 `ENOTFOUND`。
- Vercel 验证提示当前 nameserver 为 `dns11.hichina.com` / `dns12.hichina.com`，推荐 DNS 记录为 `CNAME ai -> a44989d4bdff19e0.vercel-dns-017.com.`。
- 本机没有阿里云 DNS CLI 或凭据，尚不能自动补 DNS 记录。
