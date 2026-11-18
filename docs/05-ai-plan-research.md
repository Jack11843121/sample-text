# sample-text AI 能力增强 —— 开源方案调研与建设路线

> 目标：为「给 Electron + Monaco 的本地编辑器 sample-text 增加 AI 能力」输出一份**可评审**的方案。
> 聚焦「别人怎么做的、我们能否借鉴」，避免泛泛而谈。
>
> 调研时间：2026-11。调研对象均为**开源**项目（官方文档 / GitHub README 优先）；Cursor / Windsurf 仅作 UX 参考，不参与实现约束。

---

## 0. 结论速览（TL;DR）

1. 全行业在「AI 代码助手」上已经收敛出**四层标准形态**，我们完全可以照成熟的公开设计实现，不必重新发明：
   - **内联补全 / 下一处编辑预测**（ghost text，Tab 接受）
   - **选中文本内联改写**（Ctrl/Cmd+K、Ctrl+Enter，原位替换）
   - **AI 聊天/代理面板**（流式、@-附件、斜杠命令、Apply diff）
   - **代码库上下文 RAG**（embedding 检索 + rerank，或 repo map/符号索引）
2. **模型后端几乎一律抽象成「OpenAI 兼容 API + Ollama（本地）」两个 provider 类型**。DeepSeek 本身就是 OpenAI 兼容（`api.deepseek.com`），天然被覆盖；这一抽象是低成本高回报的关键杠杆。
3. sample-text 现有架构（主进程服务 + 白名单 IPC + 沙箱 renderer + 命令面板 + 分层设置 + 插件系统）**与主流做法的安全边界完全一致**，AI 能力可直接挂进现有扩展点，改造是「渐进叠加」而非「推倒重来」。
4. 首期建议：**模型后端抽象（主进程）→ 选中文本 AI 命令（内联改写/解释/翻译）→ 内联补全 → 聊天面板**，这 4 件事即可构成可演示的 MVP；RAG 与 Agent 放二期之后。

---

## 1. sample-text 现状（与本方案相关的结论）

经核对源码与现有文档，与本方案强相关的现状：

| 维度 | 现状 | 对 AI 的意义 |
|---|---|---|
| 运行时 | Electron 33，`contextIsolation:true` + `sandbox:true` + `nodeIntegration:false`（见 `docs/02-architecture.md`） | 与 Continue/Cline 等 VS Code 扩展的安全模型一致：**网络与密钥应放主进程** |
| IPC | `src/main/ipc.ts` 白名单 `handle(...)`；构建输出已用 `webContents.send` **逐块推流**（`IPC.BUILD_OUTPUT`） | AI 流式可完全复用这套「invoke 发起 + on 通道收流」模式 |
| Preload | `src/preload/index.ts` 经 `contextBridge` 暴露 `window.sampleText` | AI 调用走同一桥，renderer 不直接持密钥、不直接发网络 |
| 编辑器 | Monaco 0.52.2，`features/completions.ts` 已用 `registerCompletionItemProvider('*')` 做词/片段补全 | AI 内联补全应用**独立的** `registerInlineCompletionsProvider`，与现有下拉补全不冲突 |
| 命令系统 | `commands/registry.ts` + 元数据（title/category）驱动命令面板（`CommandPalette`） | AI 动作用「命令」承接，天然进命令面板 + 可绑键位 |
| 设置分层 | `shared/settings.ts` `mergeSettings(Default→User→Project)` 深合并，`null` 删除 | 新增 `ai.*` 配置段，模型/密钥/温度直接分层可配 |
| 插件系统 | `plugins/host.ts`：`plugin.js` 以受信代码注册命令/订阅事件 | 二期可开放「AI provider / 斜杠命令」插件点 |
| 主进程服务 | filesystem / project / build / git / search / settings-store 等已成建制 | 主进程已有 `fs`、`git`、`search` 可用，RAG 上下文采集有现成底子 |

结论：**AI 能力应当且能够**作为「主进程新增 `ai` 服务 + renderer 新 features + 命令/键位/设置接入」来落地，不需要动现有安全边界与数据流骨架。

---

## 2. 逐项目调研

> 每个项目按「提供哪些能力 / 关键实现方式 / 最值得借鉴的 3 点」组织。

### 2.1 Continue.dev

- **背景/许可**：开源 AI 代码助手（VS Code / JetBrains 插件 + CLI）。Apache-2.0。⚠️ **主仓库 `continuedev/continue` 已转为只读**（发布最终 2.0.0 后停止维护），但其架构仍是值得照抄的经典范本。
- **提供的能力**（现版 docs）：
  - **Agent mode**（文件探索工具 + 规则 + MCP 完成多步任务）、**Chat mode**、**Edit mode**（原地改当前文件）、**Autocomplete**（内联补全）、CLI。
  - **模型角色（model roles）**：`chat` / `edit` / `apply` / `autocomplete` / `embed`（embedding）/ `rerank`（重排）—— 把「同一个后端按用途拆成 6 个角色」是很有价值的设计。
  - 历史版本还提供 @Codebase / @Docs 上下文 provider（现已被「工具 + `.continue/rules` + MCP + 自定义 RAG」取代）。
- **关键实现方式**：
  - 前端是 IDE 扩展：补全用 VS Code 的 `InlineCompletionItemProvider`；聊天用 webview。
  - 核心是 TS 单仓（`core/`），跨 VS Code/JetBrains 复用；`core/llm` 做多 provider 抽象（OpenAI、Anthropic、Gemini、Ollama、Bedrock、Azure、xAI、OpenRouter、OpenAI-compatible、Mistral 等），并带 LLM 日志/用量埋点。
  - 检索/RAG（历史 `core/indexing`）：代码分块（suffix/tree-sitter 感知）→ embedding → 本地向量库（SQLite/LanceDB）→ BM25+向量混合检索 + rerank。
  - Autocomplete 交互：`Tab` 全量接受、`Esc` 拒绝、`Cmd/Ctrl+→` 逐词部分接受、`Cmd/Ctrl+Alt+Space` 强制触发。
- **最值得借鉴的 3 点**：
  1. **「模型角色」拆法**（chat/edit/apply/autocomplete/embed/rerank）：让用户分别指定大模型 vs 小补全模型 vs embedding/rerank 模型，一个配置段搞定，且符合 DeepSeek/Ollama 实际部署习惯。
  2. **配置驱动的 provider**：`config` 里声明 provider 类型就能切 OpenAI 兼容 / Ollama，逻辑与 UI 解耦，等于给了我们一份「最少字段」清单。
  3. **补全的部分接受 + 强制触发的键位语义**（word 级接受、手动重触发），是内联补全体验的关键细节。

### 2.2 Zed 编辑器

- **背景/许可**：Rust 原生编辑器（GPUI）。开源（GPL）。AI 能力内建且文档非常清晰，是「编辑器本体如何抽象 AI」的最佳参考——因为它和我们一样是**编辑器产品**，而不是 IDE 插件。
- **提供的能力**：
  - **Edit Prediction（下一处编辑预测）**：随打字预测多行代码，ghost text，`Tab`/`Alt+Tab` 接受，支持部分接受（下一个词/下一行）、多个候选（next/previous）。
  - **Inline Assistant**：`Ctrl+Enter` 把当前选区（或多光标）发给模型并原位替换；支持 @-附件、一次性给多个模型出多份结果、可绑定预填 prompt。
  - **Agent Panel**：多线程 agent、工具集、MCP、skills、instructions、@-提及、并行 agents；**Git 提交信息生成**。
  - 模型接入：Zed 托管 / 各家 API key / 网关 / 本地模型（Ollama / 任意 OpenAI 兼容 server）。
- **关键实现方式**：
  - 把所有补全后端收敛为**一个「edit prediction provider」接口**：`github-copilot`、`codestral`、`mercury`、`ollama`、`open_ai_compatible_api` 都实现同一接口，配置里选一个。
  - **FIM（fill-in-the-middle）prompt 模板表**：`prompt_format` 显式列出 `code_llama`(⑇PRE/SUF/MID⑉)、`star_coder`、`deepseek_coder`、`qwen`、`codestral`、`glm`、`zeta2`…，`infer` 按模型名自动识别。这是「本地补全模型适配」的标准做法。
  - 走**OpenAI `/v1/completions` 端点**（`prompt` + `max_tokens` + `temperature` + `stop`），配置项含 `prediction_debounce`（防抖）、`max_output_tokens`。
  - Inline Assistant 明确区分于 Edit Prediction：前者「显式、prompt 驱动」，后者「自动、上下文推断」—— 这个产品边界划分值得直接照搬。
- **最值得借鉴的 3 点**：
  1. **补全/改写统一走一个 provider 抽象 + FIM prompt 模板表**，本地模型（Ollama）与在线 API 用同一套前端，只换模板与端点。
  2. **内联改写的交互范式**：`Ctrl+Enter` 选区→浮层 prompt→原位替换 + 多光标并行 + 多模型对比，是「select→AI 命令」的最佳落地参考。
  3. **把「自动补全」与「显式改写」分成两个独立功能**，各自独立开关/防抖/键位，避免体验互相打架。

### 2.3 aider

- **背景/许可**：开源 AI 结对编程 CLI（Python）。Apache-2.0。核心卖点是 **git 集成 + 精确代码编辑**。
- **提供的能力**：
  - 对话式改代码；**自动 commit**（生成合理 commit message），用 git 做 diff/撤销/审查。
  - **Repo Map（代码库地图）**、`/-` 聊天内命令（/add /model /drop…）、聊天模式（code/architect/ask/help）、lint/test 自动修、watch 模式（在 IDE 里写注释让 aider 响应）、语音、图片/网页、prompt caching。
- **关键实现方式**：
  - **Repo map**：用 tree-sitter 提取每个文件的类/函数签名，建成「文件节点 + 依赖边」的图，做**图排序**只把最相关的符号塞进 token 预算（`--map-tokens` 默认 1k），随对话动态扩容。**先用符号级上下文，不够再让模型点名看文件**——比无脑向量检索更省 token。
  - **Edit formats（编辑格式）**：`whole`（整文件重写）/`diff`（SEARCH/REPLACE 块）/`udiff`（简化 unified diff）…按模型强弱自动选，双向规避「懒改」（elide 成 `# ... original code ...` 注释）。
  - 模型后端：OpenAI/Anthropic/Gemini/DeepSeek/Ollama/OpenAI-compatible/OpenRouter/LM Studio… 全部可接，`--model deepseek` 直接跑（aider-CHAT 也内置 DeepSeek R1/V3 支持）。
- **最值得借鉴的 3 点**：
  1. **「符号级 repo map + 图排序」作为轻量 RAG**：在 sample-text 已有「项目符号索引」（`symbols.ts` / `symbolIndex.ts` / `Goto Symbol in Project`）基础上，这是成本最低的「代码库上下文」起点，不必一上来就上 embedding。
  2. **Edit format 的多格式抽象**：把「让模型产出可机器应用的代码改动」显式化（whole/diff/udiff），并允许为不同模型选格式——这就是我们「Apply diff」的协议设计。
  3. **git 即审查/回滚机制**：sample-text 已集成了 git 状态与行级 diff，AI 改动可以天然走 diff 视图 + 回退。

### 2.4 Cline

- **背景/许可**：开源 VS Code AI 智能体（另有 CLI/桌面/JetBrains/SDK）。Apache-2.0。
- **提供的能力**：
  - **Plan / Act 双模式**：Plan 只探索+提问+列方案，Act 才真正执行；每处文件编辑、每条终端命令都要审批（或 auto-approve）。
  - 跨文件编辑（读懂项目结构、多文件协同改），**每处改动以 diff 呈现，可审阅/修改/回退**，并有 **checkpoints** 可整体撤销。
  - 跑 bash、监看输出、后台长任务；web 浏览；**MCP 服务器**与**插件（SDK 注册工具）**；`rules`（.clinerules）+ skills。
  - 多 provider：OpenAI/Anthropic/Gemini/OpenRouter/Bedrock/Azure/GCP/Ollama/LM Studio/**任意 OpenAI 兼容**。
- **关键实现方式**：
  - 以「**工具调用循环（tool-use loop）**」为核心：read_file / write_file / run_command / browse 等工具，模型不断选工具执行直到完成，人在环上审批。
  - 头部轻量 CLI + `@cline/sdk`：把同一套 agent 引擎复用到 CLI / headless / JetBrains / 桌面（Tauri + Bun sidecar）。
- **最值得借鉴的 3 点**：
  1. **Plan/Act 分离 + 逐条审批**：这定义了「agent 模式」的最小安全模型——先只读探索，改动必须 diff 审阅。
  2. **diff 审阅 + checkpoint 回退**：即便 agent 写坏，也能一键回到之前状态——比裸 `executeEdits` 安全得多。
  3. **工具/能力可插拔（MCP + SDK 工具）**：给 sample-text 一个远期扩展方向，首期不必做。

### 2.5 Tabby & twinny（本地模型补全路线）

- **背景/许可**：Tabby（TabbyML）——自托管补全服务器；twinny——VS Code 本地补全/聊天扩展，MIT（单人长期维护，现迁至 `twinnydotdev/twinny`）。
- **提供的能力**：
  - **Tabby**：自建 LLM 补全服务器（Docker/Homebrew），OpenAI 兼容 API + 原生补全端点；服务端用 **tree-sitter 解析相关代码**构造 prompt；IDE 扩展用「自适应缓存 + 流式 + 取消」把延迟压到 <1s；配套模型目录。
  - **twinny**：本地优先的一次到位补全/聊天扩展——**FIM 代码补全（ghost text 流式）**、**Inline edit（Ctrl+I，逐 hunk diff 审阅 + Accept/Reject）**、聊天（@ 附文件/符号/problems/git diff/终端/工作区检索）、**agent mode**、**工作区索引（关键词+向量混合 + rerank，保存时增量更新）**、code review、commit message、终端命令、可编辑 prompt 模板。
- **关键实现方式**（twinny 最值得抄）：
  - provider 抽象覆盖：本地（Ollama / LM Studio / llama.cpp / Oobabooga / LiteLLM / **任意 OpenAI 兼容**）+ 托管（OpenAI/Anthropic/Mistral/**DeepSeek**/OpenRouter/Gemini…），可「本地模型补全 + 在线模型聊天」混搭。
  - **工作区索引 = 关键词 + 向量混合检索 → rerank → 进 prompt**，是「本地 RAG」的务实配方（不依赖外部向量服务）。
- **最值得借鉴的 3 点**：
  1. **FIM 补全 + 内联改写 + 聊天的「本地三件套」**，一上来就是完整产品形态，且全 MIT，可直接二次开发。
  2. **「本地补全 + 在线聊天」模型混搭**：非常贴合 sample-text「本地优先、可选联网」的定位。
  3. **混合检索 + rerank 的本地 RAG 配方**，比纯向量更稳，实现复杂度可控。

### 2.6 Sourcegraph Cody

- **背景/许可**：开源 AI 助手（VS Code / JetBrains / Web / `cody-agent` headless）。Apache-2.0。
- **提供的能力**：**自动补全、聊天、自定义命令（Commands）**、上下文（@ 文件/符号/仓库）、**agent 模式**（工具化多步任务）。
- **关键实现方式**：
  - 上下文差异化能力来自 **Sourcegraph 代码图/代码搜索**：精确符号搜索 + 引用 + embeddings，把「整个仓库/远程仓库」作为 RAG 来源（企业级卖点）。
  - 前端扩展（VS Code）用 `InlineCompletionItemProvider` + webview；`cody-agent` 是无头 agent 进程，执行工具化工作流。
  - 模型后端：Anthropic/OpenAI/Google/Bedrock/Azure/Ollama（本地）/OpenAI 兼容，站级或客户端配置。
- **最值得借鉴的 3 点**：
  1. **把「命令（Commands）」作为一等公民**：explain / generate tests / smell / document 等预置 prompt 可自定义，即「斜杠命令库」。
  2. **符号级代码图作为上下文**：与 aider 的 repo map 同理，验证了「符号索引是 RAG 的低成本等价物/前置物」，sample-text 已有符号索引，可复用。
  3. **headless agent 与 UI 分离**（cody-agent）的思路，与未来把 agent 放主进程/utilityProcess 一致。

### 2.7 Cursor / Windsurf（仅 UX 参考，非开源）

- **Cursor**：`Tab`（多行 next-edit 预测）、`Cmd+K` 内联改写、Composer/Agent 面板、@ 提及（文件/文档/网页）、`.cursorrules` 规则、本地代码库索引（embeddings）、Apply 时 diff 审阅。
- **Windsurf**（Codeium）：Cascade 多步 agent、Supercomplete 下一处编辑预测、内联编辑、Memories（长期记忆）、Flow。
- **对 UX 的启示**（不影响实现选型）：
  1. 用户心智已固化为「**ghost text 预测 + 内联改写 + 聊天/agent 面板**」三连，我们照此形态做即可零学习成本。
  2. **内联改写用浮条（toolbar）**承载 prompt 输入，比弹大框轻；**Apply 一律先 diff**。
  3. 「**规则/记忆**」是让 agent 表现一致、可复用的关键增值，中期值得做（成本低）。

---

## 3. 通用 AI 编辑器能力清单（去重汇总）

> 优先级：必备 = 首期就要；推荐 = 二期；可选 = 远期/按需。
> 难度：以 sample-text 现有技术栈（Electron + Monaco + React + TS）为基准。

| # | 能力 | 说明（去重后） | 优先级 | 难度 |
|---|---|---|---|---|
| 1 | 内联补全 / 自动补全（FIM ghost text） | 随打字预测，Tab 接受、Esc 拒绝、逐词部分接受、手动强制触发 | **必备** | 中 |
| 2 | 下一处编辑预测（next-edit，多行） | 预测「接下来要做的整块编辑」，eager/subtle 两种显示 | 推荐 | 高 |
| 3 | 选中文本内联改写（inline edit） | 选区→prompt→原位替换，Diff 预览，逐 hunk 接受/拒绝 | **必备** | 中 |
| 4 | AI 聊天面板（流式、多轮、会话） | 侧栏/底部面板，流式渲染，保留会话历史 | **必备** | 中 |
| 5 | 斜杠命令 / 自定义命令 | explain/refactor/translate/summarize/document/test/fix 等预置 prompt，可自定义 | **必备** | 低 |
| 6 | @-mention 上下文附件 | 附文件/选中/符号/git diff/诊断/工作区检索结果 | 推荐 | 中 |
| 7 | 代码库上下文 RAG | embedding + 检索 + rerank（或符号级 repo map 作为轻量替代） | 推荐 | 高 |
| 8 | 符号级 repo map / 代码图 | 轻量代码库上下文，tree-sitter 抽符号 + 图排序 | 推荐 | 中 |
| 9 | Apply diff 审阅（+回退） | AI 改动先以 diff 呈现，逐 hunk 接受/拒绝，checkpoint 回退 | 推荐 | 中 |
| 10 | 生成 commit message / code review | 从暂存 diff 生成提交信息、评审改动 | 可选 | 低 |
| 11 | 模型后端抽象（多 provider） | OpenAI 兼容 + Ollama + 托管 API；模型角色（chat/edit/apply/autocomplete/embed/rerank） | **必备** | 中 |
| 12 | FIM prompt 模板适配 | code_llama/qwen/deepseek_coder 等 prompt_format 表，本地补全模型适配 | 可选 | 中 |
| 13 | 规则 / 项目指令 | `.continue/rules`、`.clinerules`、`.cursorrules`：项目级编码规范/架构约定 | 推荐 | 低 |
| 14 | Agent 模式（plan/act + 工具 + 审批） | 读写文件、跑命令、MCP/插件工具，人环审批 | 可选 | 高 |
| 15 | 流式取消 / 用量统计 / 错误重试 | 请求与幂等、取消、token 用量、失败回退 | **必备** | 低 |

---

## 4. 最小可行 AI 能力集（首期 4-6 件事）

> 原则：**先让「选中→AI」闭环可见，再做「自动补全」的持续体验，最后叠「多轮聊天」**；RAG 与 Agent 放二期。

### 首期（排序 = 上线优先级）

1. **AI 模型后端抽象层**（前提件）
   - 主进程新增 `services/ai/`：`AiProvider` 接口（`chatStream` 流式聊天 + `complete` 补全/FIM + `listModels`）。
   - 两个实现：`OpenAICompatProvider`（覆盖 DeepSeek：`baseURL=https://api.deepseek.com`，模型 deepseek-chat/deepseek-reasoner）与 `OllamaProvider`（`http://localhost:11434`）。
   - 设置分层新增 `ai.*`（provider、baseURL、model、apiKey、temperature、maxTokens、completion 模型）。
2. **选中文本 → AI 命令**（首个可见功能，轻、见效快）
   - 注册为命令（进命令面板 + 可绑键）：`AI: 解释所选`、`AI: 翻译所选`、`AI: 总结所选`、`AI: 改写所选`、`AI: 修复所选`、`AI: 生成测试`。
   - 交互：选区→触发命令（快捷键 `⌘⌥E` 打开内联 prompt 浮条）→流式返回→**原位替换选区**（可先 Diff 预览）。参考 Zed Inline Assistant / Cursor Cmd+K。
3. **内联补全（ghost text）**
   - 用 Monaco 独立 `registerInlineCompletionsProvider`（与现有下拉补全 `registerCompletionItemProvider('*')` 并存不冲突）。
   - 首期用聊天模型做补全（简单，DeepSeek 可干），二期再接本地 FIM 模型 + prompt_format 表。
   - 键位：`Tab` 接受 / `Esc` 拒绝 / `⌥→` 逐词接受 / `⌥⌘Space` 强制触发；带防抖（配置 `ai.completion.debounce`）。
4. **AI 聊天面板（多轮流式）**
   - 新 React 面板（复用现有面板/BuildPanel 的挂载方式），流式渲染（仿 `BUILD_OUTPUT` 推流）。
   - @ 附上「当前文件 / 当前选区」（首期不引 RAG）。
5. （可选）**从暂存 diff 生成 commit message**：叠在现有 git 集成上（`git.diffLines` 已有），成本低、演示效果好。
6. （可选）**Apply diff 预览**：让上面「改写/修复」先出 Monaco diff（`createDiffEditor` 或双模型对比），再一键接受。

> 综合：首期做 **1、2、3、4** 四件即可交付一个「有自己的 AI 助手」的编辑体验；5、6 作为顺手增强。

### 推荐架构

#### 4.1 模型后端：放主进程，OpenAI 兼容抽象

```
renderer ──(invoke: ai.start ...)──► preload ──► 主进程 services/ai
                                                  ├─ OpenAICompatProvider  → DeepSeek / 任意 OpenAI 兼容
                                                  └─ OllamaProvider        → 本地 Ollama
                                                  流式：webContents.send('ai.stream', {reqId, chunk})
                                                （复用构建输出的推流模式）
```

- **为什么放主进程**：密钥不落 renderer（sandbox 内不可信）、Node 有全局 fetch/undici、可读写环境变量与 keychain、可集中做用量/日志；与 Continue/Cline 把网络放「宿主」一致。
- **抽象形态**（照 Zed/Continue 的收敛结果）：只需 `openai-compatible` + `ollama` 两种 provider 类型即可覆盖 DeepSeek / vLLM / LM Studio / llama.cpp 全部场景；接口带 `stream: true` 与取消。
- DeepSeek 天然就是 OpenAI 兼容：`POST /chat/completions`（deepseek-chat / deepseek-reasoner，支持 SSE 流式）。补全如需 FIM，二期走 `/completions` + `deepseek_coder` 模板（同 Zed 的 `open_ai_compatible_api` 配置）。

#### 4.2 进程职责切分

| 关注点 | 放哪 | 理由 |
|---|---|---|
| 密钥/网络/HTTP SSE/重试/用量 | **主进程** `services/ai` | 安全 + Node 能力 |
| 上下文采集（读文件/symbol/索引） | 主进程（复用 `fs`/`search`/符号） | 减少 IPC 往返 |
| Monaco 内联补全 / 选区 / 光标 | **renderer**（features） | 只有 renderer 接触 editor 实例 |
| 聊天 UI / 流式渲染 | **renderer**（React 组件 + store） | UI 归 renderer |
| 命令/键位/设置接入 | renderer + shared + 主进程 settings-store | 沿用现有三层 |

#### 4.3 流式如何进 Monaco

- **聊天面板**：主进程逐 chunk 推 `ai.stream` 事件 → renderer 更新 React state → 文本增量渲染（无 Monaco 参与，最简单）。
- **内联补全**：不必「逐 token 进编辑器」。业界（Zed/Cursor/Continue）都是「**先收流、后整块呈现 ghost text**」：定期/结束时把累积文本作为 `InlineCompletions` 的 `insertText`（含 `range` 与 `asCommand`）一次性供给；用户 `Tab` 接受时应用。取消用 `reqId` + `AbortController`。
- **需逐 token 呈现给编辑器的场景**（可选）：用 Monaco `executeEdits` 增量 patch，但首期不建议，收益低、复杂度高。

#### 4.4 选中文本 → AI 命令的交互

1. 用户选中文本（或多光标）→ 按 `⌘⌥E`（或命令面板）。
2. renderer 取 `editor.getSelection()` + 选区文本 + 当前语言/文件名，弹出**内联浮条**（Monaco 无 QuickInput，自研一个轻量浮层，仿 Zed 的 inline assistant）。
3. 浮条内可选预置命令（解释/翻译/改写/…）或输入自由 prompt。
4. `ai.start` → 主进程流式返回 → 浮条内流式预览。
5. 点击应用 = `editor.executeEdits` 原位替换选区（改写类）；或进入「Apply diff」预览（修复/重构类）。

---

## 5. 分期实施路线图

### 第一期（4–6 周）：可演示的「AI 助手」MVP

- 交付：模型后端抽象（OpenAI 兼容 + DeepSeek + 可选 Ollama）+ 设置 `ai.*` + 选中文本 AI 命令（改写/解释/翻译/总结/修复）+ 内联补全 + 聊天面板 + commit message（可选）。
- **本期末可见**：装好 DeepSeek key，选中一段代码 `⌘⌥E` 秒出改写/解释并原位替换；光标处 Tab 弹出补全；侧栏能多轮问代码问题并流式出字。

### 第二期（4–6 周）：上下文与工程化

- 交付：@-mention 附件（文件/选中/符号/git diff/搜索结果）+ **符号级 repo map 上下文**（复用现有符号索引，tree-sitter 摘要 + 图排序，先于 embedding）+ FIM 本地补全（Ollama + prompt_format 表，本地模型补全、在线模型聊天混搭）+ Apply diff 审阅 + 规则（`.sample-text/ai-rules.md` 之类）。
- **本期末可见**：聊天/改写能「看懂仓库」——引用跨文件符号、按项目规范写码；本地无网也能用 Ollama 补全。

### 第三期（按需）：RAG 与 Agent

- 交付：真·代码库 RAG（embedding + BM25/向量混合 + rerank，本地向量库）+ 斜杠命令库（可插件化）+ Agent 模式（plan/act + 读写文件/跑命令工具 + 审批 + checkpoint 回退，运行在 utilityProcess 或独立 worker）+ 用量统计与日志。
- **本期末可见**：向 agent 下一句「按规范给整个模块加单测并跑通」，它在后台读文件、改代码、跑测试、出 diff 等审批。

---

## 6. 参考链接

- Continue.dev：<https://docs.continue.dev>（features/models/autocomplete）、源码 <https://github.com/continuedev/continue>（Apache-2.0，已只读）
- Zed AI：<https://zed.dev/docs/ai/overview>、<https://zed.dev/docs/ai/edit-prediction>、<https://zed.dev/docs/ai/inline-assistant>，源码 <https://github.com/zed-industries/zed>
- aider：<https://aider.chat/docs>、<https://aider.chat/docs/repomap.html>、<https://aider.chat/docs/more/edit-formats.html>，源码 <https://github.com/Aider-AI/aider>
- Cline：<https://github.com/cline/cline>（起 agent/plan-act/工具/MCP/多 provider）、<https://docs.cline.bot>
- Tabby：<https://tabby.tabbyml.com/docs/welcome>、源码 <https://github.com/TabbyML/tabby>
- twinny：<https://github.com/twinnydotdev/twinny>（MIT；补全/内联改写/聊天/工作区索引/provider 抽象）
- Sourcegraph Cody：<https://sourcegraph.com/docs/cody>、源码 <https://github.com/sourcegraph/cody>
- UX 参考（非开源）：Cursor <https://cursor.com>、Windsurf <https://windsurf.com>

---

### 附：可评审的 3 个关键决策点（供评审会聚焦）

1. **首期是否上 RAG？** 建议**不上 embedding，先用「符号级 repo map」**（复用现有符号索引），成本低 1~2 周且效果可用；向量 RAG 放二期。
2. **内联补全首期用聊天模型还是本地 FIM？** 建议**首期用 DeepSeek 聊天模型做补全**（最快跑通，命中率足够演示），本地 FIM + prompt 模板二期再补。
3. **AI 改动如何落地？** 建议**默认走 diff 预览再应用**（改写/修复类），仅「纯展示类」命令（解释/翻译）用原地替换/面板，兼顾安全与效率。