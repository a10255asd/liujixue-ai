# AI Agent 接手说明

更新时间：2026-07-15

## 项目概况

项目：`liujixue-ai`

目标域名：`https://ai.liujixue.cn`

定位：

> 给 0 基础开发者，尤其是想转 AI Agent 工程师的人，用一条可执行路线学 AI、做项目、刷面试、准备求职。

## 当前阶段

当前已完成项目创建、产品设计和详细技术设计文档沉淀。

不要直接部署，不要创建 Vercel 项目，除非用户明确说开始部署。

## 必读顺序

1. `README.md`
2. `docs/PRODUCT_DESIGN.md`
3. `docs/TECHNICAL_DESIGN.md`
4. `docs/CONTENT_MODEL.md`
5. `docs/IMPLEMENTATION_PLAN.md`
6. `docs/REFERENCE_SOURCES.md`
7. `content/*.json`

## 下一步推荐

优先执行 `docs/IMPLEMENTATION_PLAN.md` 的 Batch 1：

1. 安装依赖。
2. 按技术设计补 TypeScript、Zod、Lucide 和 Playwright 基础依赖。
3. 创建 `app/layout.tsx`、`app/page.tsx`、`app/globals.css`。
4. 创建 `lib/content` Schema、仓储层和关系层。
5. 建立核心路由并从仓储层读取内容。
6. 添加基本测试和移动端截图检查。
7. 本地 `npm run build` 通过。

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
npm run lint
npm run build
```

## 与其他项目关系

- `liujixue-main`：主站，后续要增加 `ai.liujixue.cn` 入口。
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
- 尚未初始化远端仓库，尚未部署。
