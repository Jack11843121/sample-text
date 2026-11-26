# sample-text（文本大师 TextMaster）对标 VS Code 核心能力差距分析

> 版本：sample-text v0.2.4 · 支撑架构基于 `docs/02-architecture.md` · 2026-11-26
> 结论导向：**可评审、可落地**。每项差距均落到具体文件/命令/IPC 扩展点，并标注实现难度与用户价值。

---

## 0. 结论速览（TL;DR）

sample-text 在「文本编辑器 + 语言着色的 Sublime 向」上已经很强，但和 VS Code 的核心竞争力（**代码理解 + 工程闭环 + 无感体验**）之间，最大缺口不是「编辑能力」，而是这三块：

1. **代码理解闭环缺失**：没有诊断（红波浪线）、没有快速修复/灯泡、没有真实 Rename（F2 只是触发无实现的 action）、IntelliSense 只有词库 + 文本提示，缺真实语言智能（TS/JS/Python/JSON 校验）。这是「从编辑器到 IDE」的分水岭。
2. **工程闭环缺失**：没有集成终端、没有任务系统（只有 build system）、Git 只有 gutter 没有内联 diff/暂存/提交。
3. **高频无感体验缺失**：没有自动保存、外部变更冲突提示、编辑器导航历史（Alt+←/→）、标签页拖拽/Pin/双击改名/Close Saved。

**优先策略**：先把「高价值 + 低/中难度」的无感体验与代码理解「轻量版」做掉（第 4 节 7 项），再上「高价值 + 中高难度」的终端 / 任务 / 真实 IntelliSense（第 5 节二期）。

---

## 1. 方法论与对标依据

- 对标对象：VS Code 官方文档的核心能力分类 —— Basic Editing、IntelliSense、Code Navigation、Refactoring、Snippets、Workspaces/Multi-root、Source Control、Terminal、Tasks、Settings。
- 现状判断：以代码为准（`src/` 逐文件核实），不重复研究已有能力（已具备项见开头列表）。
- 难度口径：**低** = 单个文件/少量状态即可落地；**中** = 需新增 feature 模块 + IPC + 类型契约；**高** = 需引入依赖、原生构建、或长期迭代引擎。
- 价值口径：以「每天使用频率 × 迁移用户搁浅成本」综合评估。

---

## 2. 现状盘点（代码级核实，用于避免误判）

| 能力项 | 代码证据 | 结论 |
| --- | --- | --- |
| 括号配对着色 | `editor/session.ts:105` `bracketPairColorization.enabled:true` | ✅ 已有 |
| 缩进参考线 | `editor/session.ts:104` `guides.indentation:true` | ✅ 已有（括号 guides 缺，见 3.1） |
| 重命名 F2 | `commands/editorCommands.ts:174` 仅 `action('editor.action.rename')`，**无 RenameProvider**；`keybindings/defaults.ts:86-89` F2 已被「下一书签」占用 | ⚠️ 部分（有入口无实现，且键冲突） |
| 诊断 / 快速修复 | 全仓 grep 无 `setModelMarkers` / `registerCodeActionProvider` / `registerRenameProvider` | ❌ 缺失 |
| IntelliSense | `session.ts:107 quickSuggestions + suggest.showWords`；`features/completions.ts` 仅 `.sublime-completions/.sublime-snippet` 词库，未注册 monaco TS/JS worker | ⚠️ 部分（无语言智能） |
| 终端 | 无 `node-pty`/`@xterm` 依赖；`build.ts` 的 `spawn` 仅用于构建 | ❌ 缺失 |
| 任务 | `appCommands.ts:440 collectBuildSystems()` + 内建 fallback，无 tasks.json / 自动侦测 / 问题匹配 | ⚠️ 部分（仅 build） |
| 自动保存 | 无 `auto_save` 设置项；保存仅 `save_active`（⌘S） | ❌ 缺失 |
| 外部变更 | `App.tsx:81-92` 仅在 `!doc.dirty` 时 `reloadFile`，脏文件静默忽略 → 覆盖风险 | ⚠️ 部分（无冲突提示） |
| 标签页 | `components/TabBar.tsx` 右键仅 close/others/right/left/all，无拖拽/Pin/改名/Close Saved | ⚠️ 部分 |
| 面包屑 / Outline | 无 `Breadcrumb`/`OutlinePanel` 组件；`symbols.ts extractSymbols()` 已可复用 | ❌/⚠️ 部分 |
| 符号/定义跳转 | `symbols.ts + symbolIndex.ts` 启发式（JS/TS/Python/MD），`goto_definition` 走 Monaco 内置词法 | ⚠️ 部分（启发式，无语言服务精度） |
| Quickpick 复用 | `components/CommandPalette.tsx` 已五合一（command/file/symbol/line/snippet/color_scheme） | ✅ 已有 |
| Git | `features/gitGutter.ts` diff gutter + `git.ts` status；无内联 diff/暂存/提交 | ⚠️ 部分 |
| 设置搜索 | 设置以 JSON 文件编辑（`open_user_settings`），无 GUI + 搜索 | ❌ 缺失 |
| 多窗口/多根 | `ipc.ts app.openInNewWindow`（单实例语义）+ `.sublime-project` folders | ⚠️ 部分 |
| 装饰器模式 | `gitGutter.ts`/`bookmarks.ts` 用 `createDecorationsCollection` + `IModelDeltaDecoration` | ✅ 可复用基建 |

---

## 3. 差距明细（按能力域）

### 3.1 编辑器基础体验

#### 3.1.1 缩进参考线升级：括号对参考线 + 活动括号高亮（缺失，低难度，中价值）
- VS Code 对标：`editor.guides.bracketPairs` 为每对括号画竖直参考线，`highlightActiveBracketGuide` 加粗当前所在括号对，对深嵌套代码定位帮助极大。
- 现状：只有 `guides.indentation`，无 bracket guides / active bracket guide。
- 做法：在 `src/renderer/editor/session.ts` 的 `editorOptions()` 里追加：
  ```ts
  guides: { indentation: true, bracketPairs: true, highlightActiveBracketPair: true },
  bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
  stickyScroll: { enabled: true }   // 可选：置顶当前作用域，见 3.1.2
  ```
  并加设置项 `render_bracket_guides` / `sticky_scroll` 到 `store.ts DEFAULT_SETTINGS` 与 `@shared/settings`（沿用现有 merge 体系，零 IPC 改动）。

#### 3.1.2 置顶滚动 Sticky Scroll（缺失，低难度，中价值）
- VS Code 对标：滚动时把当前函数/类的定义头钉在视口顶部（`editor.stickyScroll.enabled`）。
- 做法：Monaco 0.52 原生支持 `stickyScroll` 选项，`session.ts` 一行 + 一个设置开关即可。属于「顺手即改」。

#### 3.1.3 编辑器右键菜单（部分，低难度，中价值）
- VS Code 对标：右键 native context menu 聚合 **Cut/Copy/Paste/Command Palette + Go to Definition/Peek/References/Rename Symbol/Format Document/Quick Fix + Source Control/Reveal in Explorer**。
- 现状：Monaco 自带基础右键（Cut/Copy/Paste/Command Palette 等），`session.ts:145 installAiContextMenu()` 已示范 `editor.addAction({contextMenuGroupId})` 追加 AI 项。**缺 Rename / Quick Fix / 显式 Go to Definition / Format** 的聚合，且 AI 项挤在默认分组上方不雅观。
- 做法：在 `installAiContextMenu` 同文件扩展一个 `installNativeContextMenu(editor)`，用 `contextMenuGroupId: 'navigation'` / `'1_modification'` 追加：
  ```
  editor.action.revealDefinition / peekDefinition / goToReferences / editor.action.rename / editor.action.quickFix / editor.action.formatDocument
  ```
  这些 Monaco action 无需新 provider 即可触发（QuickFix/Rename 需 3.2 有 provider 才生效，故与 3.2 联动）。

#### 3.1.4 Emmet（HTML/CSS 快速展开）（缺失，低-中难度，中价值）
- VS Code 对标：内置 Emmet（`ul>li*5` 展开、`.class`/`#id` 补全）。
- 做法：引入 `monaco-emmet`（或内联一个轻量 abbr 解析）在 `features/` 注册 `registerCompletionItemProvider` + 快捷键展开；对前端用户价值高，对非前端用户可后置。

### 3.2 代码理解与导航（核心缺口）

#### 3.2.1 重命名符号 F2（部分，低难度，高价值）
- VS Code 对标：F2 对标识符「跨文件级」重命名，实时预览、撤销、更新所有引用。
- 现状：`rename_symbol` 命令存在但 `editor.action.rename` 因无 `RenameProvider` 而空转；**F2 被书签占用**。
- 做法（两档）：
  - **第一档（本次即可，词法级）**：新建 `src/renderer/features/rename.ts`，用现有 `symbols.ts extractSymbols()` 的启发式定位光标处标识符，注册：
    ```ts
    monaco.languages.registerRenameProvider(['javascript','typescript','python','json','shell'], {
      provideRenameEdits(model, position, newName) {
        const re = model.findMatches(wordPattern, ...) // 全文件同名 token
        return { edits: [{ resource: model.uri, edit: { edits: re.map(r => ({ range: r.range, text: newName })) } }] }
      }
    })
    ```
    键位：`keybindings/defaults.ts` 将 `f2` 改为 `rename_symbol`，书签 next/prev 迁移到 `alt+f2`/`shift+alt+f2`（写清权衡，见注释）。
  - **第二档（二期，语言服务级）**：接入 LSP rename（见 3.2.4）。
- 落点：`features/rename.ts`（新）+ `editorCommands.ts:174`（已有命令）+ `defaults.ts`（改键）+ `store.ts`/菜单（无需改）。

#### 3.2.2 诊断红波浪线（缺失，中难度，高价值）
- VS Code 对标：语法/类型/静态检查错误以红波浪线 + 资源管理器徽章 + 问题面板呈现。
- 做法：新建 `src/renderer/features/diagnostics.ts`，核心两行：
  ```ts
  monaco.editor.setModelMarkers(model, 'lint', markers) // markers: {startLineNumber,..., severity: monaco.MarkerSeverity.Error, message}
  ```
  markers 来源用「轻量 LSP 思路」三段式：
  1. **内置快速校验**：JSON 语法（monaco 自带 `json` worker）、括号配平、行尾空格——零依赖。
  2. **外部工具有就调**：主进程新增 `src/main/services/lint.ts`，`spawn('eslint'|'tsc --noEmit'|'flake8'|'ruff')` 解析其 JSON/文本输出为结构化诊断，走新 IPC `lint.run`（`ipc.ts` + `preload/index.ts` + `shared/types.ts SampleTextApi`）。
  3. **长期**：接真实 LSP（见 3.2.4）。
- 落点：`services/lint.ts`（新，主进程）+ `features/diagnostics.ts`（新，渲染）+ IPC `lint.run` + `types.ts` 增 `Diagnostic` 类型 + 复用 `gitGutter.ts` 的 decorator 模式画波浪线（`className` 样式）。

#### 3.2.3 快速修复 / Code Actions / 灯泡（缺失，中难度，高价值）
- VS Code 对标：光标落在问题处出现💡灯泡，点开给出 quick fix（导入、重命名、转 camelCase、未用变量删除等）。
- 做法：与 3.2.2 联动，在 `diagnostics.ts` 注册：
  ```ts
  monaco.languages.registerCodeActionProvider(lang, {
    provideCodeActions(model, range, ctx, token) {
      const fixes = ctx.markers.map(m => ({ title: m.message, command: ..., kind: 'quickfix', diagnostics: [m] }))
      return { actions: fixes, dispose(){} }
    }
  })
  ```
  Monaco 会自动在快速修复可用处显示灯泡；快捷键 `editor.action.quickFix`（⌘.）在 `defaults.ts` 绑定。参考实现：VS Code 内置 ESLint/TS 扩展将诊断映射为 `CodeAction` 的模式。

#### 3.2.4 IntelliSense 升级（部分→真实语言智能，高难度，高价值）
- VS Code 对标：TS/JS 有类型感知补全、hover、签名帮助；Python 靠 Pylance/Pyright；JSON 靠 schema 校验。
- 现状：仅词库 + 文本提示 + AI 内联；无任何语言服务。**这是「编辑器 vs IDE」最深的沟**，但不是首期。
- 做法（分阶段）：
  - **阶段 A（中）**：注册 monaco 内置 TypeScript/JSON worker（`monaco.languages.typescript.typescriptDefaults.setCompilerOptions` + tokenizer），为 TS/JS/JSON 白嫖一大截真实 IntelliSense（monaco-editor 自带）。
  - **阶段 B（高）**：接轻量 LSP——启动 language server（`typescript-language-server` / `pyright` / `rust-analyzer`）作为子进程，主进程 `utilityProcess` 跑，JSON-RPC over stdio 翻译为 Monaco 的 `registerHoverProvider/completion/definition/rename/signatureHelp`。落点与现有插件宿主规划（`03-architecture.md` 的 `services/plugins.ts`）同构，可复用 `utilityProcess` 基建。
- 建议：首期只做「阶段 A」（TS/JS/JSON 三语言），把「真实定义跳转 + 精准补全 + 类型提示」这三件高频事先拿到手。

#### 3.2.5 Breadcrumb 面包屑 & Outline 大纲面板（缺失/部分，低难度，中价值）
- VS Code 对标：顶部面包屑（文件 > 类 > 方法）可点击导航；侧栏 Outline 面板展示当前文档符号层级。
- 现状：`symbols.ts extractSymbols(model)` 已能产出 `{name, detail, line, kind}`，但只在「Goto Symbol」跳转用，无常驻 UI。
- 做法：
  - **Outline**：新建 `components/OutlinePanel.tsx`，在 `Sidebar.tsx` 里把右侧栏改成「FOLDERS / OUTLINE」两个 tab（仿 VS Code 资源管理器/大纲），用 `extractSymbols(getModel(activePath))` 渲染 + 点击 `revealLineInEditor`。
  - **Breadcrumb**：新建 `components/Breadcrumb.tsx`，在 `App.tsx` 的 `main-col` 顶部 `TabBar` 下方渲染，点击跳转。
- 落点：`components/Breadcrumb.tsx`（新）+ `components/OutlinePanel.tsx`（新）+ `App.tsx` + `Sidebar.tsx` + `symbols.ts`（复用）。

### 3.3 标签页与编辑器历史

#### 3.3.1 标签页高级交互：拖拽排序 / Pin / 双击改名 / Close Saved（缺失，低难度，高价值）
- VS Code 对标：拖拽重排、Pin 固定（脏/重要文件不被挤走）、双击标题重命名（作用等同于 Save As）、右键「Close Saved / Close Unsaved」。
- 现状：`TabBar.tsx` 只有关闭类右键；`store.ts` 的 `tabOrder` 是 MRU 数组，无 `pinned` 集合，无重排 API。
- 做法：
  - **拖拽**：`TabBar.tsx` 用 HTML5 drag 事件（`draggable + onDragStart/onDragOver`），命中后调用新增 `store.moveTab(from, to)`。
  - **Pin**：`store.ts` `AppState` 增加 `pinned: Set<string>`；`TabBar` 渲染锁定图标，固定项排除在 MRU 挤占与「Close Others」之外。
  - **双击改名**：双击触发输入框，回车 = `io.saveActiveAs()`（untitled）或 `fs` 内改名 + `store` 换 path 引用（复用 `saveUntitledAs` 的模型重定位逻辑 `io.ts:162`）。
  - **Close Saved**：`TabBar.openTabMenu` 菜单追加两项，复用 `io.closePaths`，过滤 `doc.dirty`。
- 落点：`components/TabBar.tsx` + `store.ts`（`moveTab`/`pinned`/`renameDocument`）+ `io.ts`（改名复用 save-as）+ `menu` 无需改（`menu.context` 已支持任意 entries）。

#### 3.3.2 编辑器导航历史 Alt+← / →（缺失，低难度，高价值）
- VS Code 对标：`workbench.action.navigateBack/Forward`，在「光标位置、定义跳转、文件切换」之间来回穿越，是 VS Code 用户粘性最高的快捷键之一。
- 现状：只有「编辑点历史」（`session.ts:236 editPoints`，Next/Prev Edit Point），无「导航历史」。
- 做法：`session.ts` 新增导航栈 `navHistory: {path, line, col}[]`，在以下事件推栈（防抖去重）：`onDidChangeCursorPosition`（跨行/跨文件时）、`revealDefinition`/`goto_*`/palette 跳转后。新命令 `nav_back`/`nav_forward` 在 `editorCommands.ts` 注册，`defaults.ts` 绑定 `primary+alt+left/right`。参考 VS Code 「Navigation History」实现（路径+选区快照，push 阈值 ~500ms）。
- 落点：`editor/session.ts`（栈）+ `commands/editorCommands.ts`（命令）+ `keybindings/defaults.ts` + `menu.ts`（可选菜单项）。

### 3.4 终端与任务

#### 3.4.1 集成终端（缺失，高难度，高价值）
- VS Code 对标：底部可复用/分屏终端，支持 shell 集成、cwd=当前文件目录、点击 npm 报错跳转。
- 做法：
  1. 依赖：`node-pty`（主进程 PTY）+ `@xterm/xterm` + `@xterm/addon-fit`（渲染）。
  2. 主进程 `src/main/services/terminal.ts`：`pty.spawn(shell, [], {cwd, env, cols, rows})`，IPC：`terminal.create/cwd/input/resize/dispose`，输出 `send(IPC.TERMINAL_DATA)`。
  3. 渲染 `components/TerminalPanel.tsx`：xterm 挂载，底栏面板（复用现有 `BuildPanel` 的 bottom panel 骨架 + 状态新增到 `store.ts UiState`）。
  4. 构建/打包注意：`node-pty` 是原生模块，electron-builder 需 `electron-rebuild` 或 `rebuild` 脚本（`build:mac/win` 前）。
- 落点：`services/terminal.ts`（新）+ `components/TerminalPanel.tsx`（新）+ `ipc.ts`（新 handle）+ `preload/index.ts` + `shared/types.ts` + `package.json`（新依赖）。

#### 3.4.2 任务系统 Tasks（部分，中难度，高价值）
- VS Code 对标：tasks.json、自动侦测（`npm`/`tsc`/`gulp`/`make`）、`Run Task…` 快速选择、任务输出独立通道、错误跳转。
- 现状：`BuildSystem` + `collectBuildSystems()` 已覆盖「构建并解析 file_regex 跳转」，缺任务发现 UI 与多任务分类。
- 做法：
  - 类型扩展：`shared/types.ts` 的 `BuildSystem` 加 `group`/`dependsOn`/`isBackground` 字段，兼容现有 `.sublime-project build_systems`。
  - 自动侦测：新建 `services/tasks.ts` 扫描 `package.json scripts`、`Makefile`、`tsconfig`，产出任务清单。
  - UI：`CommandPalette` 复用 quickpick 做「Run Task…」（新增 `palette mode: 'task'`），`BuildPanel.tsx` 改为多任务输出通道。
- 落点：`services/tasks.ts`（新）+ `types.ts` + `CommandPalette.tsx`（加 mode）+ `BuildPanel.tsx`。

### 3.5 文件与保存

#### 3.5.1 自动保存（缺失，低难度，高价值）
- VS Code 对标：`files.autoSave = off | afterDelay | onFocusChange | onWindowChange`，`files.autoSaveDelay`。
- 做法：
  1. `store.ts DEFAULT_SETTINGS` + `@shared/settings` 增 `auto_save`/`auto_save_delay`（沿用分层机制，零 IPC）。
  2. `session.ts` 挂钩子：`onDidBlurEditorText`（focus change）、`onDidChangeModelContent` 防抖（afterDelay），触发 `io.saveActive()`（注意跳过 untitled）。
- 落点：`store.ts` + `session.ts` + `io.ts`（`saveActive` 已有，直接复用）。

#### 3.5.2 外部变更冲突提示（部分，低难度，高价值）
- VS Code 对标：磁盘被外部修改时，脏文件提示「Keep my changes / Revert / Compare」；保存时若磁盘更新过，阻止静默覆盖。
- 现状：`App.tsx:85` 仅对非脏文件自动 reload；脏文件的外部变更被静默丢弃 → 覆盖他人修改的风险。
- 做法：
  1. 在 `App.tsx` FS_CHANGED 分支：脏文件时 `api.showContextMenu`（或 dialog）弹出「磁盘已变更：Keep / Discard / Diff」。
  2. 在 `io.writeContentToDisk`（`io.ts:131`）保存前 `await api.stat(targetPath)` 比对 `mtime`，若磁盘 `mtime > doc.mtime` 弹确认，防覆盖。
- 落点：`App.tsx` + `io.ts`，复用 `menu.context` IPC。

### 3.6 源码管理 Git（部分，中-高难度，中价值）

- VS Code 对标：资源管理器内联 diff（点击改动文件看两栏对比）、暂存/取消暂存/提交、分支切换、冲突解决。
- 现状：`git.ts`（status + diffLines）+ `gitGutter.ts`（行级 gutter）已到位；缺 diff 视图、staging、commit UI。
- 做法：主进程 `git.ts` 增加 `git.diffPatch`（`git diff -- <file>`）与 `git.stage/commit` IPC；渲染复用一个「diff 对比面板」（两栏 Monaco 只读模型，参考已有 split view）。Git 是 VS Code 的护城河之一，但工程量大，建议二期选择性做「diff + commit 消息框」最小闭环。

### 3.7 设置与工作区

#### 3.7.1 设置搜索 UI（缺失，中难度，中价值）
- VS Code 对标：`⌘,` 打开设置 GUI，模糊搜索设置项、即改即生效、值类型校验。
- 现状：设置以 JSON 编辑（`open_user_settings`），对小白不友好。
- 做法：复用 `CommandPalette` 的 quickpick 基建做一个「设置面板」：从 `store.ts DEFAULT_SETTINGS` 反推 schema（键名+默认值+类型+中文描述），搜索即过滤、回车切换/编辑。落点：`components/SettingsPanel.tsx`（新）+ `store.ts`（已有 `applySetting`）。

#### 3.7.2 多根工作区（部分，中难度，中价值）
- VS Code 对标：`.code-workspace` 多根聚合、一次全局搜索/符号索引跨多根、根目录配置。
- 现状：`.sublime-project` 已支持多 folders（`ProjectData.folders`），`symbolIndex.ts` 已 `for folder` 聚合——**基础已优于仓库认知**。缺口主要是「跨根引用解析/多根搜索 UI 聚合」。
- 建议：二期补齐「跨根符号引用索引」即可，不本末倒置。

---

## 4. 首期必做清单（高价值 + 低/中难度，8 项）

> 排序按「价值 × 1/难度」。每项标注落点文件与具体命令/IPC。

### ① 标签页高级交互（拖拽 / Pin / 双击改名 / Close Saved）— 低难度 · 高价值
- 落点：`components/TabBar.tsx`（拖拽事件、Pin 图标、双击 inline input、右键菜单扩展）+ `store.ts`（`moveTab`/`pinned:Set`/`renameDocument`）+ `io.ts`（改名复用 `saveUntitledAs` 的模型重定位）。
- 命令：新增 `close_saved_tabs` / `close_unsaved_tabs` 两条 appCommand，`menu.context` IPC 已支持任意 entries，无需改主进程。

### ② 编辑器导航历史 Alt+← / → — 低难度 · 高价值
- 落点：`editor/session.ts`（新增 nav 栈，push 于 `onDidChangeCursorPosition` + 跳转命令）+ `commands/editorCommands.ts`（`nav_back`/`nav_forward`）+ `keybindings/defaults.ts`（`primary+alt+left/right`）。

### ③ 重命名符号 F2（词法级）— 低难度 · 高价值
- 落点：`features/rename.ts`（新，`registerRenameProvider`，复用 `symbols.ts`）+ `commands/editorCommands.ts:174`（已有 `rename_symbol`）+ `keybindings/defaults.ts`（`f2` 改绑 rename，书签让位到 `alt+f2`）。

### ④ 自动保存 + 外部变更冲突提示 — 低难度 · 高价值
- 落点：`store.ts DEFAULT_SETTINGS`（`auto_save`/`auto_save_delay`）+ `session.ts`（blur/content 钩子调 `io.saveActive`）+ `App.tsx`/`io.ts`（脏文件外部变更与保存前 mtime 比对弹确认）。

### ⑤ 诊断波浪线 + 快速修复/灯泡（轻量版）— 中难度 · 高价值
- 落点：`services/lint.ts`（新，主进程 spawn eslint/tsc/flake8）+ `features/diagnostics.ts`（新，`setModelMarkers` + `registerCodeActionProvider`）+ IPC `lint.run` + `shared/types.ts` 增 `Diagnostic` + 复用 `gitGutter.ts` 的 decorator 模式画波浪线。

### ⑥ Breadcrumb 面包屑 + Outline 大纲面板 — 低难度 · 中价值
- 落点：`components/Breadcrumb.tsx`（新）+ `components/OutlinePanel.tsx`（新）+ `App.tsx`/`Sidebar.tsx`（挂载/加 tab）+ `symbols.ts extractSymbols`（复用）。

### ⑦ 编辑器右键菜单补全 — 低难度 · 中价值
- 落点：`editor/session.ts`（在 `installAiContextMenu` 旁新增 `installNativeContextMenu`，`contextMenuGroupId:'navigation'` 追加 Go to Definition/References/Rename/Format/Quick Fix）。

### ⑧ 顺手即改（合并为一项）：括号对参考线 + 活动括号高亮 + Sticky Scroll — 低难度 · 中价值
- 落点：`editor/session.ts editorOptions()` 追加 `guides.bracketPairs/highlightActiveBracketPair`、`stickyScroll`，`store.ts` 加开关设置。

---

## 5. 分两期实施路线

### 一期（2~4 周）：编辑与导航体验对齐，用户「切文件/跳转/改代码」无缝
范围：上节 ①~⑧ 全部。
**用户可感知到的变化**：
- 标签页能拖拽排序、Pin 住重点文件、双击直接改名，右键能「关闭已保存/未保存」。
- `Alt+←/→` 像 VS Code 一样在光标/定义/文件之间穿梭。
- `F2` 能真正重命名标识符；`⌘.` 能弹出快速修复灯泡。
- 光标离开即保存（自动保存），别人改磁盘文件时会弹提示，不再静默覆盖。
- 顶部有面包屑、侧栏有大纲面板，深嵌套代码有括号参考线 + 置顶作用域。
- 右键菜单与 VS Code 同构（转到定义/重命名/格式化/快速修复）。

### 二期（4~8 周）：工程与智能闭环，用户「从编辑器跨到 IDE」
范围：诊断做深（多语言 lint）、IntelliSense 真实化（TS/JS/JSON worker → 轻量 LSP）、集成终端、任务系统、Git diff+commit 最小闭环、设置搜索 UI。
**用户可感知到的变化**：
- 代码即时出现红波浪线，点击灯泡一键修复（不再是 AI 手动触发）。
- TS/JS/JSON 有类型感知补全、hover 类型提示、精准定义跳转。
- 底部有真终端（cwd 跟随当前文件），点 npm 报错直接跳文件。
- 「Run Task…」一键跑 package.json / Makefile 任务，构建输出错误可点击跳转。
- Git 里点文件看两栏 diff、直接提交，不用开终端。
- `⌘,` 打开可搜索的设置面板，即改即生效。

---

## 6. 附录：能力对照总表

| VS Code 核心能力 | 本项目现状 | 难度 | 用户价值 | 首期 |
| --- | --- | --- | --- | --- |
| 编辑器右键菜单（原生聚合） | 部分（Monaco 默认 + AI，缺 Rename/QuickFix/格式化聚合） | 低 | 中 | ✅ |
| 重命名符号 F2 | 部分（有命令无 provider，且 F2 被书签占用） | 低 | 高 | ✅ |
| 快速修复 / Code Actions / 灯泡 | 缺失 | 中 | 高 | ✅ |
| 诊断红波浪线（lint/类型检查） | 缺失 | 中 | 高 | ✅ |
| IntelliSense（真实语言智能） | 部分（仅词库+文本） | 高 | 高 | 二期 |
| Go to Definition / References | 部分（启发式 + Monaco 词法） | 中 | 高 | 二期加深 |
| 括号配对着色 | 已有 | — | — | — |
| 缩进/括号参考线 + 活动括号高亮 | 部分（仅缩进 guides） | 低 | 中 | ✅ |
| Sticky Scroll 置顶作用域 | 缺失 | 低 | 中 | ✅ |
| Breadcrumb 面包屑 | 缺失 | 低 | 中 | ✅ |
| Outline 大纲面板 | 部分（符号索引，无常驻面板） | 低 | 中 | ✅ |
| 标签页拖拽排序 | 缺失 | 低 | 中 | ✅ |
| 标签页 Pin 固定 | 缺失 | 低 | 中 | ✅ |
| 双击重命名标签 | 缺失 | 低 | 中 | ✅ |
| Close Saved / Unsaved | 缺失 | 低 | 中 | ✅ |
| 编辑器历史 Alt+←/→ | 缺失 | 低 | 高 | ✅ |
| 集成终端 | 缺失 | 高 | 高 | 二期 |
| 任务 Tasks | 部分（仅 build system） | 中 | 高 | 二期 |
| 自动保存 | 缺失 | 低 | 高 | ✅ |
| 外部变更重载 + 冲突提示 | 部分（非脏重载，脏无提示） | 低 | 高 | ✅ |
| 多选光标高频命令 | 已有（覆盖充分） | — | — | — |
| 多窗口 / workspace 多根 | 部分（多窗口 + project folders） | 中 | 中 | 二期 |
| 设置搜索 UI | 缺失 | 中 | 中 | 二期 |
| Quickpick 复用文件名模糊搜索 | 已有（Goto Anything） | — | — | — |
| Git 内联 diff / 暂存 / 提交 | 部分（gutter + status） | 高 | 中 | 二期 |
| Emmet | 缺失 | 低-中 | 中 | 可选 |

---

## 7. 参考实现与资源

- VS Code 官方文档：[Basic Editing](https://code.visualstudio.com/docs/editing/codebasics) · [Code Navigation](https://code.visualstudio.com/docs/editing/editingevolved) · [Refactoring](https://code.visualstudio.com/docs/editing/refactoring) · [IntelliSense](https://code.visualstudio.com/docs/editing/intellisense) · [Tasks](https://code.visualstudio.com/docs/editing/tasks) · [Terminal](https://code.visualstudio.com/docs/terminal/basics) · [Source Control](https://code.visualstudio.com/docs/sourcecontrol/overview) · [Multi-root Workspaces](https://code.visualstudio.com/docs/editing/multi-root-workspaces)
- Monaco API：`monaco.languages.registerRenameProvider` / `registerCodeActionProvider` / `monaco.editor.setModelMarkers` / `registerHoverProvider` / `registerCompletionItemProvider`；编辑器选项 `guides` / `bracketPairColorization` / `stickyScroll`。
- 终端：`node-pty`（PTY）+ `@xterm/xterm`（渲染）+ `@xterm/addon-fit`。
- LSP 参考：`typescript-language-server` / `pyright` 的 stdio JSON-RPC；项目已有 `utilityProcess` 插件宿主规划可复用（`docs/02-architecture.md` 扩展点）。
- 诊断/lint 输出解析参考：ESLint `--format json`、`tsc --noEmit` 的 `file(line,col): error`、`flake8`/`ruff` 的 `file:line:col: CODE message`。