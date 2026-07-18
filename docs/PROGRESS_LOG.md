# AI 学习知识库进度日志

更新时间：2026-07-18

本文档只记录已完成、验证结果、当前状态和下一步，供不同 AI agent 无缝接手。产品方向看 `PRODUCT_DESIGN.md`，技术实现看 `TECHNICAL_DESIGN.md`。

## 当前里程碑

状态：Batch 10 服务器面试题组已接入。Prompt 回归、可评估 RAG、受控 Agent、Agent 评测和 MCP 工具协议五个实验原型均可运行，真实 JD 岗位校准与固定模拟面试闭环已完成；AI 知识库、面试题库、学习路径集合和面试题组均已接入 `liujixue-api` 服务器知识库，并保留本地 JSON 兜底；6 个项目当前为 4 个 `prototype`、2 个 `blueprint`、0 个 `verified`。线上基础设施继续沿用已接通的 GitHub、Vercel 和 `ai.liujixue.cn`。

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

### 2026-07-15：Batch 5 生产部署和主站接入

- 用户明确要求继续部署后，使用 Vercel CLI 发布生产部署。
- Vercel 项目 `liujixue-ai` 已部署 READY，正式域名 alias 指向最新生产部署；当前部署 ID 以 `vercel inspect ai.liujixue.cn` 为准。
- 生产部署生成 133 个静态页面。
- Vercel 已给生产部署添加 alias：`https://ai.liujixue.cn`。
- `vercel domains verify ai.liujixue.cn` 返回 `ok: true`；当前 CNAME 为 `a44989d4bdff19e0.vercel-dns-017.com.`。
- 公共 DNS 解析返回 Vercel 推荐记录；个别本地解析器若仍返回旧部署别名，应先等缓存刷新或排查本地 DNS。
- `liujixue-main` 已切换到正式域名入口并完成测试、提交和生产部署。

### 2026-07-15：Batch 6 三条核心训练路径

- 新增 `content/training-tracks.json`，固定为 LLM 服务工程、生产级 RAG、受控 Agent 生产化三条路径。
- 7 个交付任务连接现有知识点、面试题和项目，不增加内容数量；每项任务包含必须交付和完成证据。
- 新增 `/tracks` 训练工作台，支持 Hash 直达、本地进度恢复、路径重置、验收门禁和面试讲解题。
- 首页用三条交付路径替换 7 阶段长预览，主导航优先进入“训练”，完整路线仍从页脚和内容页可访问。
- 内容校验、TypeScript、ESLint、13 项单测和生产构建通过，生成 134 个静态页面。
- Playwright 桌面与手机共 27 项通过、1 项按设备条件跳过；1440px 和 390px 均无横向溢出，路径选择和本地进度重载恢复通过。

### 2026-07-16：Batch 7 阶段 1 项目证据化

- 审计全部 6 个项目：确认此前只有方案模板，没有独立运行仓库、测试或部署证据。
- 增加 `deliveryStatus` 与 `evidence` Schema，强制区分 `blueprint`、`prototype`、`verified`；当前为 1 个原型、5 个模板、0 个已验证交付。
- 项目目录和详情页公开当前成熟度、验证命令、产物、运行入口与代码入口；未验证项目的架构、功能、步骤和简历表达全部标为目标状态。
- 新增 `/labs/prompt-regression`：用 4 条固定样例比较两个 Prompt 版本，分别计算 Schema 与业务通过率、P95 延迟和估算成本。
- 固定响应夹具不发送模型请求、不需要 API Key；延迟和成本字段只用于验证评估报表流程。
- 新增 `PROJECT_EVIDENCE_AUDIT.md`，明确每个项目缺口及 RAG 原型的下一验收门禁。

### 2026-07-16：Batch 7 阶段 2 可评估 RAG 原型

- 新增 8 份版本化内部手册，共 16 个稳定章节块；引用保留文档、版本、章节和位置元数据。
- 实现关键词基线与混合检索：混合模式加入语料稀有词权重和显式概念标签，不伪装真实向量检索。
- 新增 `/labs/rag-retrieval`，支持自由提问、固定样例、模式切换、带引用抽取回答、Top 3 轨迹和证据不足拒答。
- 建立 13 条固定评估题，覆盖 Hit@3、MRR、引用覆盖和未知问题拒答；混合检索 MRR 为 `1.000`，关键词基线为 `0.958`。
- 评估集发现并修复“正常退款时效排在超时升级前”的排序问题，形成真实回归样例。
- `rag-knowledge-base` 从 `blueprint` 提升为 `prototype`，同时明确尚未实现向量库、生成模型、权限过滤和独立部署。

### 2026-07-16：Batch 7 阶段 3 受控 Agent 原型

- 新增 `/labs/controlled-agent`，用显式状态机运行正常完成、临时故障恢复、越权拦截、步数预算终止和人工审批五类轨迹。
- 工具契约声明权限、风险、重试上限和幂等能力；越权场景在工具调用前失败，高风险动作在审批前不执行。
- 临时故障重试复用同一幂等键，并且只有成功结果提交一次副作用。
- 步数预算场景恰好调用 3 次后终止，不会进入第 4 次调用；审批支持批准与拒绝双分支。
- 轨迹记录连续序号、稳定时间、工具、尝试次数、幂等键和副作用状态，可在页面切换场景回放。
- `task-planning-agent` 从 `blueprint` 提升为 `prototype`，明确尚未接入模型规划、持久化恢复、真实工具和补偿事务。

### 2026-07-16：Batch 7 阶段 4 Agent 评测门禁

- 新增 `/labs/agent-evaluation`，用相同五类目标比较宽松循环和受控状态机。
- 固定评估结果、轨迹、权限、预算与副作用五个维度，输出样本分、首个回归位置和关键安全违规。
- 发布门禁同时检查综合分、单样本最低分与关键安全违规；V1 为 56 分并阻止发布，V2 为 100 分并允许进入发布流程。
- `agent-evaluation-dashboard` 提升为 `prototype`，但仍未接真实模型 Trace、人工评分校准和线上数据。

### 2026-07-16：Batch 7 阶段 5 真实 JD 校准与模拟面试

- 新增 6 个真实 Agent Engineer 岗位样本，覆盖 OpenAI、Planera、BIO、Taxbit、Culture Amp 与 Cadence；全部保留来源链接和 2026-07-16 访问日期。
- 将岗位信号映射到现有 8 个能力域和 6 个项目，以公开成熟度权重计算证据覆盖，不把 `prototype` 误写成生产经验。
- 新增 `/career/calibration`，可切换岗位查看已有证据、证据缺口和下一行动，并回链现有项目或实验室。
- 每个岗位确定性生成 5 道不重复面试题；使用概念、设计、证据、验证四项量表自评，输出薄弱能力和训练建议。
- 评分不调用模型、不保存回答、不判断表达真实性，也不代表录用概率。

### 2026-07-16：Batch 8 服务器内容桥接

- 新增 API 内容适配层 `lib/content/knowledge-api.ts`，优先读取 `liujixue-api`，失败时回退本地 JSON。
- `/knowledge`、`/knowledge/[slug]`、`/interview`、`/interview/[id]` 和 `sitemap.xml` 已切换到 API 感知仓储函数。
- 首批服务器 AI 内容已导入：8 道面试题和 4 篇知识文章，覆盖 LLM 参数、上下文窗口、结构化输出、RAG、Agent、评测和工程化。
- 知识详情和面试答案详情新增受限 Markdown 渲染，服务器正文会按标题、段落和列表展示；详情页分类标签改为中文显示。
- 生产构建从 139 个静态页面增加到 151 个静态页面，包含服务器新增详情页。
- 最新生产部署已 alias 到 `https://ai.liujixue.cn`，当前部署 ID 以 `vercel inspect ai.liujixue.cn` 为准。

### 2026-07-17：Batch 9 服务器学习路径集合

- `liujixue-api` 新增的 AI 学习路径集合已接入 AI 子站前端，`/roadmap` 会读取 `learning_path` collections。
- 前端会先取集合列表，再按 slug 补详情，确保使用详情接口里的路径条目、排序、小节标题和知识点链接。
- 新增服务器路径区域，当前展示“AI 应用工程入门路径”及 4 个已发布知识点：RAG、Agent/Workflow、质量评估和工程可观测性。
- 新增 collection 单元测试，覆盖列表补详情、只展示 published article、条目映射和链接生成。
- 修复 `lib/agent-runtime/baseline.ts` 里重复 `releaseCandidate` 字段导致的 TypeScript 报错，并保留证据门禁版本的判定逻辑。
- API 生产数据已扩充到 3 条学习路径：AI 应用工程入门路径、RAG 质量闭环路径、Agent 上线治理路径。

### 2026-07-17：Batch 10 服务器面试题组

- `liujixue-api` 新增 3 个 `interview_set` collections：LLM 应用工程、RAG、Agent 可靠性。
- `/interview` 顶部新增“服务器面试题组”区域，会读取集合列表并按 slug 补详情，只展示已发布的 `interview_question` 条目。
- 新增 `InterviewSetCollection` 类型、映射函数和 API 读取函数，链接统一指向 `/interview/{slug}`。
- 新增题组单元测试，覆盖详情补全、过滤非面试题内容、难度映射和链接生成。
- 本地浏览器验收：1440px 和 390px 下均显示 3 个题组、10 个题组条目，横向溢出为 0。

### 2026-07-18：MCP 工具协议实验

- 新增 `POST /api/mcp` 最小 MCP server：JSON-RPC 2.0 over HTTP POST 无状态子集（streamable HTTP 单请求模式），支持 `initialize`、`notifications/initialized`、`ping`、`tools/list`、`tools/call` 五个方法，零新依赖。
- 工具清单、输入 Schema、权限守卫和执行逻辑全部复用 `lib/agent-runtime/tools.ts` 单一实现；MCP 只暴露 `search_knowledge` 与 `inspect_project_evidence` 两个只读工具，`save_learning_note` 仍只走站内人工审批通道。
- 协议错误按标准 JSON-RPC error 返回：-32700 解析错误、-32600 非法请求（batch、缺 id、多余字段）、-32601 未知 method、-32602 非法参数（含未暴露工具）；工具级失败按 MCP 约定返回 `isError: true` 而非协议错误；通知一律 202 空响应。
- 新增 `/labs/mcp-tools`：每次运行真实发出 initialize → notifications/initialized → tools/list → tools/call 四条 HTTP 消息，逐帧展示请求/响应原文、状态码与耗时；页面用工程手册风格讲清 MCP（协议层标准化）与 function calling（模型能力）的分层关系和适用场景。
- 新增 12 项 MCP 协议单测，覆盖握手版本协商、通知不应答、Schema 与运行时单一来源（防漂移）、两个工具真实调用、写工具拦截、未知 method、非法请求与三类 id 回显。
- 入口接入 sitemap、README、e2e 路由清单，`/labs/controlled-agent` 增加交叉链接。

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
- 正式域名验证：Vercel 域名验证通过、alias 指向 READY 生产部署；权威 DNS 解析正常。
- Batch 7 内容校验、TypeScript、ESLint 和 15 项单元测试通过。
- Batch 7 生产构建通过，生成 135 个静态页面。
- Batch 7 Playwright 桌面与手机共 33 项通过、1 项按设备条件跳过；项目状态、原型切换和 390px 无横向溢出均通过。
- 真实浏览器验收：1440px 项目卡片每行底部一致；Prompt 业务通过率可从 25% 切换到 100%；390px 项目证据和实验页无溢出。
- RAG 阶段内容校验、TypeScript、ESLint 和 19 项单元测试通过。
- RAG 阶段生产构建通过，生成 136 个静态页面。
- RAG 阶段 Playwright 桌面与手机共 37 项通过、1 项按设备条件跳过。
- RAG 真实浏览器验收：1440px 与 390px 均无溢出；未知价格问题零引用拒答，HTTP 429 问题返回安全重试与限流两条稳定引用。
- Agent 阶段内容校验、TypeScript、ESLint 和 25 项单元测试通过。
- Agent 阶段生产构建通过，生成 137 个静态页面。
- Agent 阶段 Playwright 桌面与手机共 41 项通过、1 项按设备条件跳过。
- Agent 真实浏览器验收：1440px 与 390px 均无溢出；预算场景 3 次调用后终止；审批前副作用为 0，批准后为 1。
- 新增 `/labs/agent-evaluation`，复用五类 Agent 目标比较 V1 宽松循环和 V2 受控状态机。
- 新增结果、轨迹、权限、预算和副作用五维评分，支持样本级首个回归位置和版本切换。
- 发布门禁同时检查综合分、单样本分与关键安全违规；V1 被阻止，V2 允许进入发布流程。
- 评测阶段内容校验、TypeScript、ESLint 和 30 项单元测试通过。
- 评测阶段生产构建通过，生成 138 个静态页面。
- 评测阶段 Playwright 桌面与手机共 45 项通过、1 项按设备条件跳过。
- 评测真实浏览器验收：1440px 与 390px 均无横向溢出；V1 为 56 分、4 个回归样本并阻止发布，V2 为 100 分、0 回归并允许发布。
- 岗位校准内容校验、TypeScript、ESLint 和 35 项单元测试通过。
- 岗位校准生产构建通过，生成 139 个静态页面。
- 岗位校准 Playwright 桌面与手机共 49 项通过、1 项按设备条件跳过。
- 岗位校准真实浏览器验收：1440px 与 390px 均无横向溢出；OpenAI 覆盖率 70，Planera 覆盖率 64；勾选 1 个评分锚点后得分稳定为 5%。
- Batch 8 内容桥接验证：`validate:content`、`typecheck`、`lint`、40 项单元测试和生产构建通过。
- Batch 8 生产构建：通过，生成 151 个静态页面。
- Batch 8 Vercel 生产部署：远端构建通过，部署 `dpl_CcQpwJRHsRV5nWD6GwVj5E8JGw91` 已 alias 到正式域名。
- 正式域名抽检：`/interview`、`/interview/llm-temperature-top-p-tradeoffs`、`/knowledge/rag-from-zero-to-one` 和 `sitemap.xml` 均返回 200，并包含服务器新增内容。
- Batch 9 本地验证：`validate:content`、`typecheck`、`lint`、59 项单元测试和生产构建通过。
- Batch 9 生产构建：通过，生成 151 个静态页面，`/roadmap` 为 5 分钟 revalidate。
- Batch 9 浏览器验收：1440px 与 390px 下 `/roadmap` 均显示“AI 应用工程入门路径”和 4 个条目，横向溢出为 0。
- Batch 9 Vercel 生产部署：远端构建通过，部署 `https://liujixue-qyfq0gx2v-a10255asds-projects.vercel.app` 已 alias 到 `https://ai.liujixue.cn`。
- Batch 9 正式域名抽检：`/roadmap` 返回 200，HTML 包含“AI 应用工程入门路径”和 4 个服务器知识点；Playwright 生产域名桌面与手机验收均无横向溢出。
- Batch 9 路径扩充部署：API 生产 collections 扩充到 3 条后，AI 子站已重新部署到 `https://liujixue-izen2u5yy-a10255asds-projects.vercel.app` 并 alias 到正式域名。
- Batch 9 路径扩充抽检：`/roadmap` 返回 200，HTML 包含 AI 应用工程入门路径、RAG 质量闭环路径、Agent 上线治理路径；Playwright 桌面与手机均为 3 条路径、10 个条目、横向溢出 0。
- Batch 10 本地验证：后端 3 个题组 JSON 校验通过，`bash -n scripts/admin-fetch.sh` 通过；AI 子站 `test:unit` 67 项通过、`typecheck`、`lint` 和生产构建通过。
- Batch 10 API 生产验证：`interview_set` 列表返回 3 个集合，详情分别返回 4、3、3 个已发布面试题条目。
- Batch 10 本地浏览器验收：`/interview` 在 1440px 与 390px 下均显示 3 个服务器面试题组、10 个题组条目，横向溢出为 0。
- Batch 10 Vercel 生产部署：远端构建通过，部署 `https://liujixue-a9pz1wzw5-a10255asds-projects.vercel.app` 已 alias 到 `https://ai.liujixue.cn`。
- Batch 10 正式域名抽检：`/interview` 返回 200，HTML 包含服务器面试题组和 3 个题组名；Chrome 桌面与手机验收均为 3 个题组、10 个条目、横向溢出 0。
- MCP 实验内容校验、TypeScript、ESLint 和 79 项单元测试通过（新增 12 项协议测试）。
- 本机 `npm run build`（webpack 编译）因机器级故障无法完成：所有 Next 项目的 webpack 构建（含未改动的 liujixue-xuan、liujixue-main）都死锁在一个永不返回的 `open()` 系统调用上，与本批改动无关；改用 `next build --turbopack` 完整构建通过，生成 152 个静态页面（新增 `/labs/mcp-tools`）。需在 Vercel 或 CI 上确认 webpack 构建恢复正常。
- MCP 生产服务器 curl 实测：initialize 返回 protocolVersion、capabilities 与 serverInfo；notifications/initialized 返回 202 空响应；tools/list 返回 2 个只读工具及其严格 Schema；tools/call 两个工具均 `isError: false`；save_learning_note 返回 -32602；未知 method 返回 -32601；非法 JSON 返回 -32700；GET 返回 405。
- Playwright 桌面与手机共 53 项通过、1 项按设备条件跳过（生产服务器 + 签名会话）；`/labs/mcp-tools` 在 1440px 与 390px 均无横向溢出，完整协议会话真实往返可见。

## 当前数据规模

- 路线阶段：7。
- 知识点：本地 33，线上合并服务器内容后 37。
- 面试题：本地 80，线上合并服务器内容后 88。
- 服务器学习路径集合：3。
- 学习路径集合条目：10。
- 服务器面试题组：3。
- 面试题组条目：10。
- 项目：6。
- 官方资料：14。
- 学习日志：1。
- 求职能力域：8。
- 自测项：12。
- 执行周：8。
- 核心训练路径：3。
- 交付任务：7。
- 真实 JD 样本：6。
- 生产构建静态页面：152（历史验证记录中的更小数字为当时 Batch 事实，不 retroactive 修改）。

## 下一步推荐

内容平台化：

1. 补一个更顺手的后台或审核导入流，让 AI、运动学、投资和心理学内容不用长期依赖命令行脚本。
2. 优化 API 详情页渲染，完整展示 `body_md`、来源、标签、追问、评分点和更新时间。
3. 扩充服务器 AI 题库与知识库时，继续保留本地 JSON 作为兜底和回归样本。
4. 给运动学、投资和心理学子站补前端入口与公开页面，同时继续让高风险内容走审核状态。

项目证据化：

1. 用服务端适配器接入真实模型规划器，保留确定性夹具作为回归基线。
2. 接入至少两个权限受控的真实工具，覆盖 Schema、超时、重试、幂等与人工审批。
3. 保存运行状态和审批决策，支持中断恢复与轨迹重放。
4. 建立至少 20 条真实任务评测，采集成功率、关键违规、延迟、Token 与成本。
5. 完成独立部署、监控、回滚和线上冒烟后，才允许把项目状态改为 `verified`。

## 不要做

- 暂不做登录、收藏、错题本、付费和 AI 子站内置数据库；服务器内容统一由 `liujixue-api` 管理。
- 暂不接模型 API 自动生成或评判内容。
- 不为了数量批量生成没有来源、没有工程解释的面试题。
- 不重做当前架构；如需变更，先更新技术设计和本日志。
