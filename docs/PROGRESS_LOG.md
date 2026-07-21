# AI 学习知识库进度日志

更新时间：2026-07-22

本文档只记录已完成、验证结果、当前状态和下一步，供不同 AI agent 无缝接手。产品方向看 `PRODUCT_DESIGN.md`，技术实现看 `TECHNICAL_DESIGN.md`。

## 当前里程碑

状态：Batch 11 服务器详情页增强已完成。Prompt 回归、可评估 RAG、受控 Agent、Agent 评测和 MCP 工具协议五个实验原型均可运行，真实 JD 岗位校准与固定模拟面试闭环已完成；AI 知识库、面试题库、学习路径集合、面试题组和服务器详情元数据均已接入 `liujixue-api` 服务器知识库，并保留本地 JSON 兜底；6 个项目当前为 4 个 `prototype`、2 个 `blueprint`、0 个 `verified`。线上基础设施继续沿用已接通的 GitHub、Vercel 和 `ai.liujixue.cn`。

## 已完成

### 2026-07-22：Batch 11 服务器详情页增强

- 新增 `KnowledgePointDetail`、`InterviewQuestionDetail`、`ApiContentMeta` 和 `ApiQuestionMeta`，详情页可读取服务器 `publicId`、topic、tags、sources、更新时间、发布时间、安全等级和题目扩展字段。
- `/knowledge/[slug]` 切换为 `getKnowledgeDetailWithApi`，在标题区展示服务器标签，侧栏展示服务器信息、更新时间、发布日、publicId 和内容来源；无 API 时继续回退本地 JSON。
- `/interview/[id]` 切换为 `getInterviewQuestionDetailWithApi`，展示建议回答时长、岗位方向、服务器更新时间、topic、publicId、技术标签、来源数量、安全等级和题目资料；考察点、追问、完整回答仍沿用统一训练结构。
- 新增详情页元数据样式，保持工程手册气质；1440px 和 390px 完整页面截图已检查，知识详情与面试详情均无横向溢出。
- 新增 2 项单元测试，覆盖知识详情和面试详情的服务器元数据保留；端到端测试增加两个详情路由与服务器证据断言，避免后续适配层压平时丢字段。

### 2026-07-18：新增 4 道 MCP 初级面试题，mcp 学习路径形成难度梯度

- 背景：95 道面试题中 mcp 类 8 道以中高级为主（初级仅 `what-is-mcp`），刚上线的 `mcp-transports`、`mcp-lifecycle` 两个进阶知识点没有对应初级自测题，路线难度断层。
- 新增 4 道初级面试题，全部 `category: mcp`、`level: 初级`、`status: published`、`lastReviewedAt: 2026-07-18`，按 schema 写全考察点/短答案/完整答案/加分点/常见错误/2 个递进追问/项目关联/references，术语首次出现给一句人话解释：
  - `mcp-transport-types`：stdio 与 Streamable HTTP 两种标准传输的场景选型（本地子进程 vs 远程共享服务），对应知识点 `mcp-transports`。
  - `mcp-initialize-handshake`：initialize 握手交换版本/能力/身份三类信息与协议版本协商回退规则，对应知识点 `mcp-lifecycle`。
  - `mcp-tools-list-call`：tools/list 与 tools/call 分工及"连接 → 握手 → initialized → 列工具 → 调工具"完整步骤，对应知识点 `mcp-lifecycle` + `mcp-primitives`。
  - `mcp-error-codes`：-32601/-32602 含义与分层排查（协议错误 vs isError 工具执行失败），对应知识点 `mcp-lifecycle`，引用 `POST /api/mcp` 真实错误行为。
- 站内事实与 `lib/agent-runtime/mcp.ts` 逐条核对：支持版本 2024-11-05 / 2025-03-26 / 2025-06-18、未知版本回退 2025-06-18、capabilities `tools.listChanged=false`、通知回 202、未知 method 回 -32601、参数问题与未知工具回 -32602（未知工具附 `error.data.exposedTools`）、写工具 `save_learning_note` 不经 MCP 暴露、工具执行失败走 `isError: true`。
- 双向关联：知识点 `mcp-transports` relatedQuestions → `mcp-transport-types` 置首（共 3 个）；`mcp-lifecycle` → 新增 `mcp-initialize-handshake`、`mcp-error-codes`（共 4 个，达上限）；`mcp-primitives` → 新增 `mcp-tools-list-call`（共 2 个）。
- 路线图：`mcp-ecosystem` questionRefs 头部插入 3 道新初级题（`mcp-transport-types`、`mcp-initialize-handshake`、`mcp-tools-list-call`），为控制总数 ≤ 10 移除尾部与新题覆盖重叠的 `mcp-capability-negotiation`（能力协商已被 initialize 握手题完整覆盖），最终 10 道，按初级在前、中高级在后形成难度梯度。`mcp-error-codes` 未挂路线图（避免与既有 `mcp-debugging` 主题重复），仅经知识点关联可达。
- references 只引 `resources.json` 已有官方条目 `mcp-docs`、`mcp-architecture`（modelcontextprotocol.io），未新增资源。
- 测试基线：`tests/content-shape.test.mjs` 两处面试题总数断言 95 → 99（内容增长的必要基线更新），ref 完整性用例继续通过。数据规模：面试题 95 → 99（mcp 类 8 → 12，初级 28 → 32）。
- 验证记录：`npm run validate:content`（8 阶段、44 知识点、99 面试题）、`npm run typecheck`、`npm run lint`、`npm run test:unit`（113 项通过）全部通过；webpack 构建死锁未恢复（已知环境问题），`npx next build --turbopack` 通过，生成 182 个静态页面（178 + 4 个面试题详情页）。

### 2026-07-18：补 3 个进阶知识点并关闭两处路线图内容缺口

- 新增 3 个知识点，全部 `published`、`lastReviewedAt: 2026-07-18`，结构与长度对齐现有 MCP 条目（单段 explanation + engineeringNotes/example/commonMistakes/interviewAnswer），术语首次出现给一句人话解释：
  - `mcp-transports`（mcp，进阶）：stdio（本地子进程、进程即会话、免网络鉴权）与 Streamable HTTP（远程服务、SSE 回推、自管鉴权与多客户端）的握手方式、会话管理、鉴权差异与选型规则；引用站内事实——`POST /api/mcp` 是 Streamable HTTP 的单请求无状态子集。relatedQuestions：`mcp-transports`、`mcp-server-design`；relatedProjects：`mcp-file-assistant`。
  - `mcp-lifecycle`（mcp，进阶）：initialize 握手与协议版本协商（本站支持 2024-11-05 / 2025-03-26 / 2025-06-18，未知版本回退服务端最新）、capability negotiation（tools.listChanged）、notifications/initialized 不应答、错误码 -32700/-32600/-32601/-32602 与 isError 的两层语义、会话终止；`/labs/mcp-tools` 可逐帧观察完整轨迹。relatedQuestions：`mcp-capability-negotiation`、`mcp-debugging`；relatedProjects：`mcp-file-assistant`。
  - `llm-determinism`（llm，进阶）：temperature=0 仍不逐字复现的三层来源（浮点求和顺序、服务端拼批、推理栈版本）、seed 参数真实边界、工程对策（结构化输出锁字段、评估用语义断言、快照测试留容忍度）；开头显式衔接入门条目 `temperature-and-sampling`。relatedQuestions：`temperature-and-determinism`、`structured-output-vs-json-mode`；relatedProjects：`prompt-debugger`。
- references 只引 `resources.json` 已有官方条目：MCP 两条用 `mcp-docs`、`mcp-architecture`（modelcontextprotocol.io），`llm-determinism` 用 `openai-platform-docs`、`openai-structured-outputs`，符合 `REFERENCE_SOURCES.md` 官方优先。
- 路线图挂载（只改 knowledgeRefs，questionRefs 未动）：`mcp-ecosystem` 按学习顺序重排为 `mcp-architecture` → `mcp-primitives` → `mcp-transports` → `mcp-lifecycle` → `mcp-security`；`ai-user-basics` 变为 `what-is-token` → `context-window` → `model-selection` → `llm-determinism` → `secrets-and-data-boundaries`（`llm-determinism` 是进阶条目，按由浅入深放在入门的 `model-selection` 之后、"AI 应用边界"条目之前）。
- 缺口关闭：上一里程碑记录的两处缺口全部关闭——`mcp-ecosystem` 知识点 3 → 5（补齐 Transport 与生命周期）；`ai-user-basics` "非确定性"主题有专属知识点。非第 0 阶段知识点路线覆盖率保持 100%。
- 测试：`tests/content-shape.test.mjs` 非第 0 阶段知识点池断言 33 → 36（内容增长的必要基线更新）；其余断言（知识点 ≥ 30、覆盖率 ≥ 85%、全部 published）不变并继续通过。
- 验证记录：`npm run validate:content`（8 阶段、44 知识点、95 面试题）、`npm run typecheck`、`npm run lint`、`npm run test:unit`（113 项通过）全部通过；webpack 构建死锁未恢复（已知环境问题），`npx next build --turbopack` 通过，生成 178 个静态页面（175 + 3 个知识点详情页）。

### 2026-07-18：路线图全部 8 个阶段挂载知识点引用与自测题引用

- 背景：上一里程碑只给第 0 阶段挂了 `knowledgeRefs` / `questionRefs`，原 7 个阶段（order 2-8）仍只有自由文本 topics，路线体验不连续。本次为 7 个阶段全部补齐两个字段，仅新增字段，不改 title/topics/projectRefs/resourceRefs/order 等既有字段。
- 匹配原则：严格按各阶段既有 topics 与 interviewFocus 选题，数组顺序即学习顺序（由浅入深），不硬凑；33 个非第 0 阶段知识点全部被覆盖（覆盖率 100%，阈值 ≥85%），无知识点跨阶段重复引用；第 0 阶段 8 个入门知识点未被重复引用。
- 各阶段挂载：
  - `ai-user-basics`（模型与 Token / 上下文窗口 / 非确定性）：知识点 `what-is-token`、`context-window`、`model-selection`、`secrets-and-data-boundaries`（对应"AI 应用边界"）；自测 `token-basics`、`context-window-management`、`token-estimation-basics`、`temperature-and-determinism`、`context-window-overflow`、`model-selection-strategy`。
  - `llm-api`（Responses API / 结构化输出 / 工具调用 / 错误处理）：知识点 `responses-api-lifecycle`、`structured-outputs`、`function-calling`、`streaming-responses`；自测 `streaming-vs-batch`、`structured-output-vs-json-mode`、`function-calling-loop`、`responses-api-lifecycle`、`llm-api-retry`、`rate-limit-control`、`parallel-tool-calls`。
  - `prompt-context`（Prompt 契约 / Few-shot / 上下文压缩 / Prompt Injection）：知识点 `prompt-contract`、`few-shot-prompting`、`context-engineering`、`prompt-injection-defense`；自测 `prompt-contract-design`、`few-shot-selection`、`conversation-summarization`、`instruction-precedence`、`context-engineering-vs-prompt`、`untrusted-context-delimiters`、`prompt-injection-defense`。
  - `rag`（Embedding / Chunking / 混合检索 / Rerank / 引用 / Eval）：知识点 `embedding-basics`、`chunking-strategy`、`vector-search`、`hybrid-search`、`reranking`、`rag-citations`、`rag-evaluation`（7 个 RAG 知识点全部归属本阶段）；自测 `what-is-embedding`、`embedding-and-vector-search`、`rag-chunking`、`vector-search-similarity`、`hybrid-search-design`、`rag-reranking`、`rag-citation-fidelity`、`rag-evaluation`。
  - `agent-engineering`（Agent Loop / Tools / State / Planning / HITL）：知识点 `agent-loop`、`tool-contract-design`、`agent-state-memory`、`planning-routing`、`agent-stop-conditions`、`human-in-the-loop`、`multi-agent-patterns`；自测 `agent-vs-chatbot`、`agent-loop-control`、`agent-tool-schema`、`agent-state-vs-memory`、`agent-planning-routing`、`agent-stop-conditions`、`human-in-the-loop`、`agent-tool-permissions`。
  - `mcp-ecosystem`（Host/Client/Server / 原语 / Transport / Security）：知识点 `mcp-architecture`、`mcp-primitives`、`mcp-security`（内容库现有 MCP 知识点共 3 个，全部归属本阶段，数量偏少但如实挂载）；自测 `what-is-mcp`、`mcp-architecture-question`、`mcp-primitives`、`mcp-transports`、`mcp-debugging`、`mcp-capability-negotiation`、`mcp-security`、`mcp-server-design`。
  - `production-career`（Eval / Tracing / 成本 / 稳定性 / 系统设计）：知识点 `agent-tracing`、`cost-latency-budget`、`agent-evaluation`、`production-reliability`；自测 `agent-tracing`、`agent-evaluation`、`eval-dataset-design`、`llm-cost-control`、`online-ai-monitoring`、`llm-as-judge`、`tool-call-evaluation`、`design-production-rag`。
- 内容缺口说明：`mcp-ecosystem` 仅 3 个知识点可挂（内容库 MCP 类知识点总共 3 个），无 Transport 独立知识点；`ai-user-basics` 的"非确定性"主题无专属知识点，靠自测题 `temperature-and-determinism` 覆盖。两处均未硬凑不相关内容。
- 测试：`tests/content-shape.test.mjs` 移除"其余 7 个阶段不应携带 knowledgeRefs/questionRefs"的过期断言，新增两个用例——"每个阶段 knowledgeRefs ≥ 3 且 questionRefs ≥ 4 且全部指向 published 记录"、"非第 0 阶段 33 个知识点路线覆盖率 ≥ 85%"（当前 100%）。单测总数 111 → 113。
- 验证记录：`npm run validate:content`（8 阶段、41 知识点、95 面试题）、`npm run typecheck`、`npm run lint`、`npm run test:unit`（113 项通过）全部通过；webpack 构建仍死锁（已知环境问题），`npx next build --turbopack` 通过；`next start` 抽查 `/roadmap` 静态 HTML，8 个阶段均渲染 `stage-refs` 区块（知识点 8 块 + 自测题 8 块），抽查 `/knowledge/hybrid-search`、`/interview/rag-evaluation` 链接目标均 200；桌面两列 / 960px 单列样式沿用上一里程碑已验证的 `.stage-refs` 响应式规则，未改动。server 已关闭，无后台进程残留。

### 2026-07-18：路线图接入第 0 阶段零基础先导入口

- Schema 扩展：`roadmapStageSchema`（`lib/content/schemas.ts`）新增可选 `knowledgeRefs`（知识点 slug 数组）与 `questionRefs`（面试题 id 数组），向后兼容——现有 7 个阶段不填写仍合法。命名对齐 `careerCapabilitySchema` / `trainingTaskSchema` 已有的同名字段。
- 引用完整性：`scripts/validate-content.ts` 在路线阶段循环内新增两条 `assertReferences`，目标集合来自仓储层（只含 `published` 记录），因此"指向真实存在且已发布内容"由同一道门禁保证。
- 新增第 0 阶段：`content/roadmap.json` 头部插入 `stage-0-beginner-foundations`（order 1，入门，published），按学习顺序引用 8 个入门知识点（`what-is-an-llm` → `api-and-api-keys` → `anatomy-of-an-llm-call` → `what-is-a-prompt` → `temperature-and-sampling` → `first-ai-app-locally` → `what-is-an-agent` → `why-rag`），自测引用 8 道初级题（`what-is-an-llm`、`what-is-api-key`、`message-roles`、`temperature-basics`、`prompt-anatomy`、`agent-vs-chatbot-essence`、`what-is-rag`、`hallucination-and-mitigation`）。原 7 个阶段 order 顺延为 2-8，`ai-user-basics` 的 prerequisites 挂到 `stage-0-beginner-foundations`，其余前置链不变。
- 页面渲染：`/roadmap` 阶段卡片在"学习目标/阶段产出"下方新增 `stage-refs` 区块——`knowledgeRefs` 渲染为带铜色序号的有序链接列表（`/knowledge/[slug]`，显示知识点标题），`questionRefs` 渲染为自测链接列表（`/interview/[id]`，显示题干）；仅当阶段携带对应字段时渲染，其余 7 个阶段行为不变。样式沿用 ink-gold 变量（`--copper` 序号、`--muted` 正文、等宽字体序号），桌面两列、960px 以下并入既有单列组，链接 `overflow-wrap: anywhere`，390px 不溢出。页头改为 `ROADMAP / 8 STAGES`，底部"不知道从哪开始"入口改指 `/knowledge/what-is-an-llm`。
- 测试：`tests/content-shape.test.mjs` 阶段数断言 7 → 8，新增"stage-0 引用顺序与字段独占"用例；`tests/content-relations.test.mjs` 的路线循环扩展 knowledgeRefs/questionRefs 引用校验，并新增"引用必须指向 published 记录"用例。单测总数 109 → 111。
- 文档：`CONTENT_MODEL.md` 路线阶段模型补充两个可选字段的语义与示例；`TECHNICAL_DESIGN.md` 更新 7.3 校验层与 8.3 `/roadmap` 渲染说明。
- 验证记录：`npm run validate:content`（8 阶段）、`npm run typecheck`、`npm run lint`、`npm run test:unit`（111 项通过）全部通过；webpack 构建仍死锁（已知环境问题），`npx next build --turbopack` 通过；抽查 `/roadmap` 静态 HTML，第 0 阶段 8 个知识链接、8 道自测链接与 `ROADMAP / 8 STAGES` 均渲染正常，且只有第 0 阶段出现 `stage-refs` 区块。

### 2026-07-18：第 0 阶段入门内容层（8 个知识点 + 15 道初级面试题）

- 针对"33 个知识点里入门只有 7 个、80 道面试题里初级只有 13 道、默认读者已见过 API Key"的缺口，补齐纯 0 基础导向的先导层：新增 8 个入门知识点（`what-is-an-llm`、`api-and-api-keys`、`anatomy-of-an-llm-call`、`what-is-a-prompt`、`temperature-and-sampling`、`what-is-an-agent`、`why-rag`、`first-ai-app-locally`）和 15 道初级面试题，全部 `status: published`，`lastReviewedAt: 2026-07-18`。
- 写作口径：工程手册风格，专业术语首次出现给一句人话解释；数字用保守表述并标注"约/因分词器而异"；references 只引 `resources.json` 中已有的官方文档条目；`anatomy-of-an-llm-call` 与 `first-ai-app-locally` 的 example 含最小 JSON/脚本示例（经 RichText 代码块渲染，并标注"以官方文档为准"）。
- 关联策略：schema 无知识点→知识点字段，"关联进阶"通过共享 `relatedQuestions` 表达（如 `what-is-an-llm` 关联进阶条目"Token、上下文与计费"的 `token-basics`；`what-is-an-agent` 关联 `agent-loop-control`；`why-rag` 关联 `embedding-and-vector-search`）；`relatedProjects` 只关联真实项目 slug（`prompt-debugger`、`task-planning-agent`、`rag-knowledge-base`）。
- roadmap 集成结论：`roadmapStageSchema` 没有知识点引用字段（只有 projectRefs/resourceRefs/自由文本 topics），且 `content-shape.test.mjs` 固定 7 阶段，故未改动 `roadmap.json`，不硬改模型。
- lab 关联映射结论：`prompt-regression`、`rag-retrieval`、`controlled-agent` 三个主题匹配的 lab 知识点引用已满 4 个上限，`agent-evaluation`、`mcp-tools` 有余量但主题不匹配入门内容，置换会挤掉更相关的进阶条目，故 `lib/content/lab-relations.ts` 未改动，2-4 个约束继续通过。
- 测试基线更新：`tests/content-shape.test.mjs` 两处面试题总数断言从 80 更新为 95（内容增长的必要基线调整），其余断言不变。
- 入门内容规模：知识点入门 7 → 15，面试题初级 13 → 28。
- 验证记录：`npm run validate:content`（41 知识点、95 面试题）、`npm run typecheck`、`npm run lint`、`npm run test:unit`（109 项通过）全部通过；webpack 构建仍死锁（已知环境问题），`npx next build --turbopack` 通过，生成 175 个静态页面（152 + 8 知识点详情 + 15 面试题详情）；抽查新页面 HTML 内容渲染正常。

### 2026-07-18：RAG 实验新增真实向量检索模式（本地开源 embedding，三路对比）

- 模型选型：`Xenova/multilingual-e5-small`（q8 量化，384 维）。理由：中文语料必须用多语言模型；e5 系列在多语言检索基准（MTEB/CMTEB）上优于同尺寸 paraphrase-MiniLM；query:/passage: 前缀差异本身成为教学点。所有多语言候选（e5-small、paraphrase-MiniLM-L12、distiluse-v2）q8 体积同为约 113MB（25 万词表决定），体积不构成区分度。
- 构建期向量：`scripts/build-rag-vectors.ts`（`npm run build:rag-vectors`）在 Node/tsx 下用 transformers.js 为 16 个章节块（`passage: {heading}\n{text}`）与 13 条评估题（`query: {query}`）生成向量，写入 `content/labs/rag-vectors.json`（模型标识、q8、维度、生成日期、query/passage 前缀、文本模板、两个内容 hash）。国内网络用 `HF_ENDPOINT=https://hf-mirror.com`。
- 再生成门禁：`lib/labs/rag-vector-hash.ts` 对文档块（id/标题/正文/tags）与评估题（id/问题/答案章节）算 sha256；`validate:content` 校验维度一致、16 块 + 13 题全覆盖、双 hash 匹配，漂移时报错并提示重跑 `build:rag-vectors`。
- 向量检索纯函数：`lib/labs/rag-retrieval.ts` 新增 `vector` 模式与 `cosineSimilarity`，复用现有引用/拒答/轨迹逻辑只换打分器；词面/概念分仍计算供 Top 3 轨迹对照。拒答阈值 0.88 按真实分数校准：正例最低 top1 余弦 0.889、未知题最高 0.871，间隔不足 0.02——阈值脆弱性如实写进页面与代码注释。
- 浏览器端查询向量：`components/labs/rag-vector-embedder.ts` 动态 `import('@huggingface/transformers')`，不进 server bundle；config/tokenizer（约 16MB）随站点静态分发（`public/models/rag-embedder/`），113MB q8 ONNX 经同源 rewrite 代理（`/rag-model/*` → hf-mirror）下载，WASM 运行时自托管（`public/vendor/ort/`，asyncify + 标准变体共 34MB）。页面明确标注"本地量化多语言模型，非生产级 embedding 服务"，首次加载提示下载体积与逐文件进度。
- 三个关键坑（均已解决并注释）：① hf-mirror 的 CORS 仅允许其自身源，浏览器必须走同源代理；② hf-mirror 反盗链对带外站 Referer 的请求返回 HTML 警告页——代理会透传 Referer，必须用 `env.fetch` 包装 `referrerPolicy: 'no-referrer'`；③ Next 代理默认 30s 超时（`experimental.proxyTimeout` 调至 600s），低速网络下会截断 113MB 响应。
- 三路对比固化：`scripts/build-rag-evaluation.ts` 输出 `content/labs/rag-evaluation-report.json`（关键词/混合/向量 × Hit@3、MRR、引用覆盖、拒答正确率），页面新增对比表；`diffEvaluationSnapshot` 防快照漂移，validate:content 与单测双重强制。结果：Hit@3 三路均 1.000；MRR 关键词 0.958 / 混合 1.000 / 向量 1.000；引用覆盖三路 1.000；未知拒答三路 1.000——本固定题集上向量与混合打平，如实展示。
- 重构：`lib/labs/rag-documents.ts` 拆出文档/评估题 schema 与摄取逻辑，避免构建脚本与向量文件解析的循环依赖。
- 新增 9 项单测（`tests/rag-vector-retrieval.test.ts`）：余弦正确性与维度守卫、真实向量排序、vector 模式引用/拒答集成、rag-vectors.json schema 与覆盖校验、hash 一致性、覆盖校验器故障注入、快照防漂移、窄分数带断言。
- 验证记录：`npm run validate:content`、`npm run typecheck`、`npm run lint`、`npm run test:unit`（109 项通过）全部通过；webpack 构建仍死锁（已知环境问题），`npx next build --turbopack` 通过（152 个静态页面）；server bundle 不含 transformers 代码（nft 追踪已用 `outputFileTracingExcludes` 排除，页面为静态页不产生 serverless 函数）。
- 实测记录（`next start` + 生产构建，Playwright 持久化 profile）：Chromium 与 WebKit 均端到端通过——切到"向量（本地模型）"后加载面板出现，模型就绪后默认样例返回 2 条引用，未知问题正确拒答 0 引用，390px 无横向溢出，外部直连 huggingface.co/jsdelivr 均为 0（WASM 本地、模型经同源代理），无控制台错误；首次全量下载 6.8s（本机网络），缓存后 1.6s。server 已关闭，无后台进程残留。

### 2026-07-18：Agent 运行轨迹对齐 OTel GenAI 语义约定导出

- 新增 `lib/agent-runtime/otel.ts`：纯函数 `mapRunToOtelTrace(run, { startedAtUnixMs })`，把一次 run 的 trace + usage 映射为对齐 OpenTelemetry GenAI 语义约定的 span 树 JSON。结构为 OTLP-ish 的 resourceSpans/scopeSpans/spans（traceId/spanId/parentSpanId/startTimeUnixNano/endTimeUnixNano/attributes/events/status），明确文档化为“结构对齐的 JSON 导出”，非完整 OTLP wire format，零新依赖、不引 @opentelemetry/sdk。
- span 树：根 `invoke_agent liujixue-controlled-agent`（INTERNAL）→ 每个规划轮次一个子 span（真实模型 `chat <model>` CLIENT；确定性 planner `plan` INTERNAL）→ 每次工具调用 `execute_tool <tool>` 子 span。属性用 `gen_ai.*` 命名空间（gen_ai.operation.name、gen_ai.provider.name、gen_ai.request.model、gen_ai.agent.name、gen_ai.tool.name/call.id/call.arguments/call.result、gen_ai.usage.input_tokens/output_tokens/cache_read/cache_creation）；平台事实放 `liujixue.runtime.*`（run.id、turn、permission、idempotency_key 等）。
- 映射语义：token usage 只聚合在根 span（逐轮拆分属于伪造）；确定性模式省略全部模型/usage 属性；守卫、审批等待、审批结果记录为 span event（guard_check/approval_requested/approval_approved/approval_rejected）；status 规则为 completed→OK、failed→ERROR(_OTHER)、budget_exceeded→ERROR(budget_exceeded)、waiting_approval/rejected→UNSET；跨检查点恢复的调用按 callId 归并到同一 span。
- traceId/spanId 由 runId 经 SHA-256 确定性派生（32/16 位 hex），同一 run 导出稳定；纳秒换算用 BigInt 避免 2^53 溢出；路由侧用 `storedAt - 最后事件 elapsedMs` 锚定近似绝对起点。
- 导出通道：`GET /api/agent/run?id=<runId>&format=otel`，复用签名会话授权与回放限流，actor 隔离不变，未知 format 返回 400，普通回放行为不变。
- 前端：`server-agent-runtime-lab` 轨迹区新增“导出 OTel JSON”按钮（有 runId 且仓储可用时），点击下载 `agent-run-<runId>.otel.json`；仅响应模式显示降级说明。受控 Agent 页新增工程手册风讲解区块：trace → OTel 映射表 + 生产 agent 为什么需要标准可观测性（可接 Jaeger/Grafana/Datadog）。
- 新增 11 项单测（`tests/agent-runtime-otel.test.ts`）：span 树层级与命名、ID 稳定性与父子关系、时间戳换算、token usage 聚合与省略、审批等待/拒绝/批准的 status 与事件、工具失败与预算拦截的 error.type、OTLP-ish 封装与属性编码。
- 验证记录：`npm run validate:content`、`npm run typecheck`、`npm run lint`、`npm run test:unit`（100 项通过）全部通过；webpack 构建仍死锁（已知环境问题），`npx next build --turbopack` 通过（152 个静态页面）。
- 实测记录（`next start` + 生产构建，fixture planner 完整 2 工具 run）：同会话回放 200、`format=otel` 200 且 6 span 结构/父子关系/status 校验通过、跨会话回放与导出均 404、未知 format 400；390px 真实浏览器无横向溢出，导出按钮与讲解区块可见；3 个测试 run 的 6 个 Redis 键已清理，无后台进程残留。注意：本地 `next start` 为 production 模式，需显式设置 `AGENT_SESSION_SECRET` 才能回放/导出（预期门禁）。

### 2026-07-18：学习闭环改造——Agent 笔记可见、lab 关联自测

- `/journal` 新增“Agent 学习笔记”客户端区块：`save_learning_note` 经审批写入的笔记现在可以在日志页看到，不再只停留在运行响应里。
- `lib/agent-runtime/storage.ts` 新增 `listLearningNotes(actorId)`：Redis 模式用 `SCAN agent:<actor 哈希>:note:*` 按签名会话 actor 隔离列出笔记，内存模式按 key 前缀过滤，按 `createdAt` 倒序；不破坏现有 actor 隔离边界。
- 新增 `GET /api/agent/notes`：返回当前签名 actor 的笔记列表（`id`、`title`、`content`、`createdAt`、`runId`）；复用固定窗口限流（30 次/60 秒）；无签名会话、身份未配置或仓储未配置时返回空列表，并用 `identityMode`、`storageMode`、`reason`（`no-session` / `identity-disabled` / `storage-disabled`）机器可读字段说明降级原因。
- 5 个 lab 页底部新增“相关知识点 / 相关面试题”区块，学完即可自测；映射集中声明在 `lib/content/lab-relations.ts`（每个 lab 2-4 个知识点 + 2-4 道面试题），只引用 `published` 内容，不改内容模型，`validate:content` 不受影响。
- 新增 10 项单测：`tests/agent-notes.test.ts`（actor 隔离、倒序、Redis SCAN 作用域、禁用仓储降级、API 三种降级/正常响应），`tests/lab-relations.test.ts`（lab 路由与映射一一对应、引用真实存在且 published、resolver 完整解析）。
- 验证记录：`npm run validate:content`、`npm run typecheck`、`npm run lint`、`npm run test:unit`（89 项通过）全部通过。本机 webpack 构建仍死锁（已知环境问题），改用 `npx next build --turbopack` 通过，生成 152 个静态页面，`/api/agent/notes` 为动态路由、`/journal` 保持静态。
- 实测记录（`next start` + 生产构建）：无会话返回 `{"identityMode":"signed-session","storageMode":"redis-24h","notes":[],"reason":"no-session"}`；经 `POST /api/agent/run` 审批流程真实写入一条笔记后，带会话 Cookie 返回该 actor 的 1 条笔记（含正确 `runId`）；另一会话读取为空的隔离验证通过；测试 actor 的 5 个 Redis 键（note/run/checkpoint）已清理，server 已关闭。

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
- 第 0 阶段内容层验证：`validate:content`（41 知识点、95 面试题）、`typecheck`、`lint`、109 项单元测试全部通过；`next build --turbopack` 通过，生成 175 个静态页面；新知识点与新面试题详情页 HTML 抽查渲染正常。
- 3 个进阶知识点批次验证：`validate:content`（44 知识点、95 面试题）、`typecheck`、`lint`、113 项单元测试全部通过；`next build --turbopack` 通过，生成 178 个静态页面。
- Batch 11 详情页增强验证：`npm run test:unit` 115 项通过，`npm run typecheck`、`npm run lint`、`npm run build` 全部通过；生产构建生成 182 个静态页面。
- Batch 11 浏览器验收：Playwright 59 项通过、1 项按设备条件跳过；`/knowledge/rag-from-zero-to-one` 和 `/interview/llm-temperature-top-p-tradeoffs` 在 1440px 与 390px 下均显示服务器元数据、publicId、标签或题目资料，横向溢出为 0；四张完整页面截图已人工检查。
- Batch 11 生产部署：Vercel 部署 `dpl_3xsD1jCBkujxCdK8sCNagYQxJ6Zq`（`liujixue-pc2jorewr-a10255asds-projects.vercel.app`）已为 `Ready` 并 alias 到 `https://ai.liujixue.cn`；正式域名 HTML 抽检确认内容档案、题目档案、题目背景和服务器内容 ID 均已上线。

## 当前数据规模

- 路线阶段：8。
- 知识点：本地 44（入门 15），线上合并服务器内容后 48。
- 面试题：本地 99（初级 32），线上合并服务器内容后 107。
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
- 生产构建静态页面：182（历史验证记录中的更小数字为当时 Batch 事实，不 retroactive 修改）。

## 下一步推荐

内容平台化：

1. 补一个更顺手的后台或审核导入流，让 AI、运动学、投资和心理学内容不用长期依赖命令行脚本。
2. 扩充服务器 AI 题库与知识库时，继续保留本地 JSON 作为兜底和回归样本。
3. 给运动学、投资和心理学子站补前端入口与公开页面，同时继续让高风险内容走审核状态。
4. 继续完善服务器来源数据，优先给高价值文章和面试题补真实 source 链接。

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
