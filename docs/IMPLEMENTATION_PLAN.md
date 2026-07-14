# 实施计划

更新时间：2026-07-15

## 当前状态

已完成：

- 创建 `liujixue-ai` 项目目录。
- 保存产品设计文档、内容模型、实施计划、交接文档和参考资料。
- 完成详细技术设计，明确模块边界、内容协议、测试与部署方案。
- 创建 Next.js 项目基础配置文件。
- 添加少量内容种子文件，方便后续页面开发。

尚未完成：

- 未创建 GitHub 仓库。
- 未接 Vercel。
- 未配置 `ai.liujixue.cn` 域名。

已完成 Batch 1：

- TypeScript、Zod、内容仓储层和校验脚本。
- 首页、7 个核心页面和三类详情页。
- SEO、404、sitemap、robots 与主站/博客入口。
- 单元测试、构建和桌面/移动端浏览器验收。

## Batch 1：项目骨架和基础页面

状态：已完成（2026-07-15）。

目标：

- 让项目能本地运行。
- 搭出首页、路线、知识库、面试题、项目实战、资料导航、学习日志的基础页面。

任务：

1. `npm install`。
2. 添加 TypeScript 严格配置、Zod、Lucide 和 Playwright 基础依赖。
3. 创建 `app/layout.tsx`、`app/page.tsx`、`app/globals.css`。
4. 创建这些路由：
   - `/roadmap`
   - `/knowledge`
   - `/agent`
   - `/interview`
   - `/projects`
   - `/resources`
   - `/journal`
5. 创建共享数据读取模块：
   - `lib/content/schemas.ts`
   - `lib/content/repository.ts`
   - `lib/content/relations.ts`
   - `lib/site-config.ts`
6. 建立首页导航和 footer。
7. 添加 `app/sitemap.ts`、`app/robots.ts` 和 `app/not-found.tsx`。
8. 添加内容校验、路由冒烟测试和桌面/移动端截图检查。

验收：

```bash
npm run lint
npm run test:unit
npm run build
```

页面检查：

- 首页能说明项目定位。
- 首页及 7 个核心页面都可访问。
- 移动端导航不遮挡内容。
- 自用学习、求职展示和对外分享三个目标表达清楚。
- 页面组件不直接读取 JSON，所有内容从仓储层获取。
- 390px 与 1440px 视口无横向滚动、按钮错位和文字遮挡。

## Batch 2：内容数据和列表页

目标：

- 路线、知识点、面试题和项目实战可以从数据源渲染。

任务：

1. 扩充 `content/roadmap.json`。
2. 扩充 `content/knowledge-points.json` 至至少 30 条。
3. 扩充 `content/interview-questions.json` 至至少 80 条。
4. 扩充 `content/projects.json` 至至少 6 条。
5. 为列表页添加筛选：
   - 分类
   - 难度
   - 标签
6. 添加单元测试：
   - 所有 slug 唯一。
   - 所有引用 ID 存在。
   - 面试题必须有考察点、短答案、追问。
   - 项目必须有简历价值字段。

验收：

- `/interview` 能按分类看题。
- `/knowledge` 能按分类看知识点。
- `/projects` 能看到项目实战和面试价值。

## Batch 3：详情页

目标：

- 每条知识点、面试题、项目都能打开详情页。

任务：

1. `/knowledge/[slug]`
2. `/interview/[id]`
3. `/projects/[slug]`
4. 添加关联推荐：
   - 知识点 -> 面试题
   - 面试题 -> 项目
   - 项目 -> 面试题
5. 添加 SEO metadata。

验收：

- 任意详情页都有完整标题、描述、内容区和返回入口。
- 不存在 404 的内部链接。

## Batch 4：求职强化

目标：

- 让站点能直接服务 Agent 工程师投递。

任务：

1. 新增 `/career` 或在 `/interview` 下新增求职页。
2. 添加 Agent 工程师 JD 拆解。
3. 添加简历项目话术。
4. 添加模拟面试训练说明。
5. 添加“我应该先学哪一阶段”的自测。

验收：

- 用户能根据自身情况知道先学什么。
- 每个项目都有可复制的简历 bullet。
- 面试题能连接到项目回答。

## Batch 5：部署和主站接入

目标：

- 子站上线 `ai.liujixue.cn`。
- 主站显眼入口跳转 AI 学习库。

任务：

1. 创建 GitHub 仓库 `a10255asd/liujixue-ai`。
2. 推送代码。
3. Vercel 创建项目。
4. 配置域名 `ai.liujixue.cn`。
5. 主站 `liujixue-main` 增加入口。
6. 更新主站 sitemap 和导航。

验收：

- `https://ai.liujixue.cn` 可访问。
- 主站首页和 header 有 AI 学习库入口。
- `robots.txt`、`sitemap.xml` 可访问。

## Batch 6：后续动态能力

先不做。等静态站稳定后再评估：

- 搜索。
- 收藏。
- 错题本。
- 学习进度。
- 模拟面试。
- AI 自动生成题目。
- 接入 `liujixue-api`。

## 停止规则

以下情况不要继续开发：

- 内容模型未更新却直接写页面。
- 面试题没有考察点和追问。
- 页面为了炫技牺牲可读性。
- 复制外部课程、书籍或网站长文。
- 尚未本地 build 通过就部署。
- 未明确域名/DNS 状态就宣称上线完成。
