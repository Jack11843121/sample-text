# sample-text 立项对标调研 —— Sublime Text 完整能力清单与技术选型依据

> 目标：以 Electron + 编辑器核心（Monaco Editor / CodeMirror 6）重新实现一个 **MIT 许可**的开源替代品 sample-text。
> 本文档为对标文档与选型依据，结论基于对官方一手资料的抓取核实：
> [sublimetext.com/docs](https://www.sublimetext.com/docs/)、[docs.sublimetext.io](https://docs.sublimetext.io/)、[packagecontrol.io](https://packagecontrol.io/)、[microsoft/monaco-editor](https://github.com/microsoft/monaco-editor)、[codemirror.net](https://codemirror.net/)。
>
> 基准版本：Sublime Text 4（Build 4215）。整理日期：2026-11-06。

---

## 1. Sublime Text 完整功能清单（穷举式）

> 分档定义：
> - **核心**：构成编辑器身份认同的能力，MVP 必须覆盖。
> - **进阶**：核心之上的高价值能力，1.x 版本覆盖。
> - **边缘**：少数用户深度依赖、可后置或由插件生态承载的能力。
>
> 高频度：**高**（几乎每次使用）/ **中**（常见工作流触发）/ **低**（特定场景）。

### 1.1 编辑核心

| 功能 | 说明（Sublime 行为） | 档位 | 高频度 |
|---|---|---|---|
| 多选 / 多光标（Multiple Selections） | 同一时刻多处光标同步编辑；Quick Add Next(⌘D)、Quick Skip Next、Find All(⌥⌘G / Alt+F3)、Undo Selection(⌘U) 逐步回退；Esc 收拢为单光标 | 核心 | 高 |
| 列编辑（Column / Rectangular Selection） | 矩形选区，非独立模式，基于多选区实现；鼠标（⌥+拖动 / 中键），键盘（⌃⇧↑↓）；可加/减选区 | 核心 | 高 |
| 代码折叠（Code Folding） | 按语法作用域/缩进折叠，标签折叠，折叠全部/展开；折叠标记在 gutter | 核心 | 中 |
| 自动补全（Auto Complete） | 来源四路：当前文件单词、context-aware 索引建议、`.sublime-completions` 文件、snippet、Python 插件；含 kind 元数据、annotation、rich details（minihtml 链接） | 核心 | 高 |
| Snippet 片段（代码片段） | `.sublime-snippet`（XML）；`tabTrigger`/`scope`/`contents`；字段 `$1..$n`、`$0` 出口；`${1:default}`；变量 `$TM_*`；正则替换 `${name/regex/replace/flags}`；嵌套/镜像字段 | 核心 | 高 |
| 宏（Macros） | 录制命令序列并回放（`record_macro`/`run_macro`），存 `.sublime-macro` | 进阶 | 低 |
| 撤销树 / 撤销（Undo） | 标准撤销/重做；**软撤销**（Soft Undo, Ctrl+U）可逐步撤销选区操作但不撤销文本改动 | 核心 | 高 |
| Vintage / Vim 模式 | 官方 vi 模拟（默认禁用，`Vintage` 包）：motion、text object、operator、`.` 重复、count、register、macro、bookmark；Ex 模式不在内（靠 VintageEx）；依赖 `setting.command_mode` 上下文 | 进阶 | 中 |
| 免打扰模式（Distraction Free） | 全屏居中纯文本，隐藏全部 chrome；独立 `Distraction Free.sublime-settings`（可记住选择性显示） | 边缘 | 低 |
| 拼写检查（Spell Check） | 基于 Hunspell，`.dic` 词典（UTF-8），`added_words`/`ignored_words`，`next_misspelling`/`add_word`/`ignore_word` | 边缘 | 低 |

### 1.2 导航

| 功能 | 说明 | 档位 | 高频度 |
|---|---|---|---|
| Goto Anything | 模糊匹配任意文件（Ctrl+P）；前缀 `:`(行)、`@`(符号)、`#`(文本搜索) | 核心 | 高 |
| Goto Symbol（文件内） | 当前文件符号列表（Ctrl+R） | 核心 | 高 |
| Goto Symbol in Project（全局符号） | 项目内符号模糊搜索（Ctrl+Shift+R），由索引引擎支撑 | 核心 | 中 |
| Goto Line | 精确跳行（Ctrl+G） | 核心 | 高 |
| Goto Definition / Reference | 由**索引引擎**（后台低优先级进程扫描全项目）记录符号与引用；悬浮 def 弹窗、F12/Shift+F12 | 核心 | 中 |
| 项目内符号索引 | `index_files`/`index_workers`/`index_exclude_patterns`/`.gitignore` 排除；同时为补全提供语料 | 核心 | 中 |
| Find in Files / 增量搜索 | 项目级正则搜索、结果面板、结果导航（F4） | 核心 | 高 |

### 1.3 界面

| 功能 | 说明 | 档位 | 高频度 |
|---|---|---|---|
| Minimap 代码缩略图 | 右侧文档全景缩略条，可点击定位、显示改动/选中区域 | 核心 | 高 |
| 分屏编辑（Split Panes） | 多列/多行 grid 布局（`set_layout`），每格独立 Sheet 群组 | 核心 | 高 |
| 标签页 / 文件切换 | Tab；ST4 新增 **Tab Multi-Select**（多标签并列选择/分屏）；MRU 切换、半瞬态(semi-transient)预览标签 | 核心 | 高 |
| 侧边栏（Side Bar） | 文件夹树、Open Files；Git 状态徽章；文件/文件夹排除 pattern | 核心 | 高 |
| 状态栏（Status Bar） | 行/列、语法、缩进、编码、Git 分支与改动数、索引进度百分比 | 核心 | 高 |
| 命令行（Command Palette） | 模糊命令面板，插件贡献命令/快捷面板（quick panel） | 核心 | 高 |
| 可定制主题配色 | Theme(主题，控制 UI chrome) 与 Color Scheme(配色，控制语法 token) 分离；`.sublime-theme` / `.sublime-color-scheme`；GPU 渲染、暗色模式自动切换 | 核心 | 高 |

### 1.4 工程

| 功能 | 说明 | 档位 | 高频度 |
|---|---|---|---|
| 项目文件夹 / Workspace | `.sublime-project`（folders/settings/build_systems，可入 VCS）+ `.sublime-workspace`（打开文件、每格布局等用户态，不入 VCS）；每文件夹排除/包含 pattern、follow_symlinks | 核心 | 高 |
| Build System 构建系统 | `.sublime-build` JSON；`cmd`/`shell_cmd`；`file_regex`/`line_regex` 结果导航；`selector`/`file_patterns`/`keyfiles` 自动匹配；`variants`；`windows/osx/linux` 平台分支；变量 `$file`/`$project` 等；`target` 可指向自定义 Python 命令；可取消；交互式输入 | 进阶 | 中 |
| Diff（增量 diff + Git） | **Incremental Diff**：逐字节增量追踪改动（vs 磁盘 / vs index / vs HEAD），gutter 标记、行级改动导航(Ctrl+.)、内联 diff hunk 显示、改动回退(Ctrl+K,Ctrl+Z)；**Git Integration**：侧边栏/状态栏状态、Subline Merge 联动(blame/history) | 进阶 | 中 |
| 命令行接口（CLI） | `subl` 命令：打开文件/项目、`-n` 新窗口、`--wait` | 边缘 | 低 |

### 1.5 配置与扩展

| 功能 | 说明 | 档位 | 高频度 |
|---|---|---|---|
| Settings JSON + 层级合并 | `Preferences.sublime-settings` 分层：Default → Default(平台) → User → 项目 → 语法特异 → 缓冲区；Editor/UI/App 三类；`toggle_setting`/`set_setting` | 核心 | 高 |
| Key Bindings 键位 | `.sublime-keymap`：`keys`(多键序列)/`command`/`args`/`context`(条件表达式，含 `num_selections`/`selector`/`panel` 等)；修饰键 `primary/super/...` | 核心 | 高 |
| Package Control 包管理 | 中央 channel（`channel_v3.json`）→ repository JSON → 包元数据；Git/GitHub tag 直装；依赖管理；install/upgrade/remove 事件；`.sublime-package`(zip) 与松散目录，目录可覆盖 zip 内文件 | 核心 | 高 |
| Python 插件 API | Python 3.8；`sublime`（Window/View/Buffer/Settings/Phantom/Html/CompletionItem/Syntax…）+ `sublime_plugin`（ApplicationCommand/WindowCommand/TextCommand/EventListener/ViewEventListener/TextChangeListener + InputHandler）；`plugin_loaded/unloaded` 生命周期；线程安全；支持构建 LSP 等 | 核心 | 高 |
| TextMate 语法 / 主题兼容 | 新一代 `.sublime-syntax`（非确定语法、多行构造、lazy embed、语法继承）；**向后兼容 `.tmLanguage`（TextMate）与 `.tmTheme`（配色）**；scope name 体系 | 核心（生态）| 高 |
| 菜单 / minihtml / 颜色方案选择 | `Main.sublime-menu` 合并、minihtml 弹窗、quick panel | 边缘 | 低 |

---

## 2. 对标实现映射表

三条技术路线：
- **A：Monaco Editor 为主**（Editor 内核用 Monaco，配 `vscode-textmate` + `vscode-oniguruma` 复用语法）。
- **B：CodeMirror 6 为主**（Editor 内核用 CM6，配 `@lezer/*` 语法）。
- **C：二者混合**（Monaco 主编辑 / CM6 轻量视图；或共享 TextMate 高亮层）。

可行性等级：`原生支持` > `需封装`（组合官方 API+少量胶水）> `需自研`（无现成，需开发）> `较难`（无成熟方案，需深度定制）。

### 2.1 编辑核心

| 功能 | A（Monaco） | B（CM6） | C（混合） | 关键依赖 |
|---|---|---|---|---|
| 多选 / 多光标 | 原生支持（Alt+Click、`addSelection`、`editor.action.insertCursorAbove/Below`、`addSelectionToNextFindMatch`） | 原生支持（`EditorState.allowMultipleSelections`、多个 `SelectionRange`） | 原生 | — / `@codemirror/state` |
| 列编辑 | 原生支持（Alt+拖拽、`Shift+Alt` 光标，`mouseColumnSelect`） | 原生支持（Alt+拖拽矩形选区，`drawSelection`） | 原生 | — |
| 代码折叠 | 原生支持（`FoldingRangeProvider` + 缩进折叠 `contrib/folding`） | 原生支持（`@codemirror/language` `foldCode`/`foldGutter`） | 原生 | `@codemirror/language` |
| 自动补全 | 原生支持（`CompletionItemProvider`、`InlineCompletion`、suggest widget、kind/详细面板） | 原生支持（`@codemirror/autocomplete`、`CompletionResult`、info render） | 原生 | `@codemirror/autocomplete` |
| Snippet 片段 | 原生支持（`CompletionItem.insertText` + `SnippetString`，字段 `$1/$0/${1:x}` 语法近似 TextMate） | 需封装（`snippet()` 补全 + 字段 tab 循环，需自建 `.sublime-snippet` 解析器） | 原生 | `@codemirror/autocomplete` |
| 宏 | 需自研（命令序列录制/回放，无声明式 macro 文件） | 需自研 | 需自研 | 自研 command bus |
| 撤销 / 软撤销 | 原生支持（`undo/redo` 栈 + `CursorState`/selection 历史，可仿 Undo Selection） | 原生支持（`@codemirror/commands` `undo/redo` + 事务粒度） | 原生 | `@codemirror/commands` |
| Vintage / Vim | 较难（社区 `monaco-vim`，与多光标/官方架构耦合度一般，需深度封装） | 需封装（`@replit/codemirror-vim`，成熟、专为 web 设计，支持多光标） | 较难 | `monaco-vim` / `@replit/codemirror-vim` |
| 免打扰模式 | 需封装（宿主侧隐藏 chrome，简单） | 需封装 | 需封装 | Electron BrowserWindow/全屏 |
| 拼写检查 | 较难（Monaco 无内置；用 Electron 内置 spellchecker + 自定义 decoration，或 `cspell`/`hunspell-wasm`） | 需自研（decoration + 词典；社区 `codemirror-` 拼写插件不成熟） | 需自研 | `hunspell-wasm` / `cspell` / Electron `webContents` spellchecker |

### 2.2 导航

| 功能 | A（Monaco） | B（CM6） | C（混合） | 关键依赖 |
|---|---|---|---|---|
| Goto Anything | 需自研（宿主级模糊文件面板 + 打开；Monaco quick-open 未正式公开） | 需自研（同左，CM6 无内置；用 `fzf`/`fuse.js` 自研模糊层） | 需自研 | `fuse.js` / `fzf`(WASM) |
| Goto Symbol（文件内） | 需封装（`DocumentSymbolProvider` + 自绘大纲/quick pick） | 需封装（`syntaxTree` + `@codemirror/language`，构建 outline） | 需封装 | 自研 quick pick |
| Goto Symbol（全局） | 需自研（后台索引 worker + 符号库 + 面板） | 需自研 | 需自研 | `worker_threads`/`Web Worker` + 索引 |
| Goto Line | 原生支持（`editor.action.gotoLine`） | 需封装（无现成命令，几行 `dispatch` 即可） | 原生 | — |
| Goto Definition / Reference | 原生支持（`DefinitionProvider`/`ReferenceProvider`、`linkedEditing`） | 需封装（`@codemirror/language` + 无内置定义服务，靠 LSP/自定义 cursor） | 原生（Monaco 侧） | `vscode-languageserver-*` / LSP client |
| 项目符号索引 | 需自研（Sublime 式启发式索引，非 LSP） | 需自研 | 需自研 | 自研索引器 |
| Find in Files | 需封装（Monaco 单文件 find；全局搜索宿主自研 + 结果树） | 需封装（`@codemirror/search` 只做单文件；全局自研） | 需封装 | `ripgrep`(rgrp binary) 或 Node 遍历 |

### 2.3 界面

| 功能 | A（Monaco） | B（CM6） | C（混合） | 关键依赖 |
|---|---|---|---|---|
| Minimap | **原生支持**（`minimap.enabled` + 渲染装饰） | 需封装（社区 `@replit/codemirror-minimap`，需适配主题/改动标记） | 原生（Monaco 侧） | `@replit/codemirror-minimap` |
| 分屏编辑 | 需封装（`editor.setModel` + 多实例 grid 布局，宿主侧） | 需封装 | 需封装 | 自研 layout + `react` dnd |
| 标签页 / 文件切换 | 需封装（宿主侧；Tab Multi-Select 为自研交互） | 需封装 | 需封装 | `zustand`/`@tanstack/react-*` + `electron-store` |
| 侧边栏 | 需封装（宿主侧 UI + Node fs/watch） | 需封装 | 需封装 | `chokidar` / `fswin` |
| 状态栏 | 需封装（宿主侧） | 需封装 | 需封装 | React 组件 |
| Command Palette | 需自研（命令注册表 + 模糊匹配面板；统一调度 `editor.trigger` 与宿主命令） | 需自研 | 需自研 | `fuse.js` + 命令注册表 |
| 主题 / 配色 | 需封装（`monaco.editor.defineTheme` + `defineTokens`；`.tmTheme` 经 `monaco-themes` 转换；UI 主题宿主 CSS） | 需封装（`EditorView.theme` + `@lezer/highlight` `HighlightStyle`；**无 tmTheme 语义**，需自换算 scope→tag 映射） | 混合（Monaco 色表 + 宿主 UI） | `monaco-themes` / `@lezer/highlight` |

### 2.4 工程

| 功能 | A（Monaco） | B（CM6） | C（混合） | 关键依赖 |
|---|---|---|---|---|
| 项目 / Workspace | 需封装（宿主侧：项目 JSON 解析、文件树、会话状态持久化） | 需封装 | 需封装 | `electron-store`、`chokidar`、自研 workspace 模型 |
| Build System | 需自研（`child_process.spawn`、`shell_cmd`、输出逐行解析 `file_regex`、结果导航、`variants`、平台分支、取消） | 需自研 | 需自研 | Node `child_process` / `shell-quote` |
| Diff / Git | 需封装（`monaco.editor.createDiffEditor` 原生双向 diff；**增量 gutter diff + inline hunk + 回退需自研**；Git 状态用 `simple-git`/`isomorphic-git`） | 需封装（`@codemirror/merge` 官方合并视图；增量 gutter 需自研；Git 状态自研） | 需封装 | `simple-git` / `isomorphic-git`；`@codemirror/merge` |
| CLI | 需自研（`electron` 单实例锁 + IPC 转发 `open file -n --wait`） | 同左 | 同左 | `electron` app.requestSingleInstanceLock |

### 2.5 配置与扩展

| 功能 | A（Monaco） | B（CM6） | C（混合） | 关键依赖 |
|---|---|---|---|---|
| Settings JSON + 分层合并 | 需封装（自研分层 merge 引擎：Default/平台/User/项目/语法/缓冲区） | 需封装 | 需封装 | `deepmerge-ts` / 自研 | 
| Key Bindings | 需封装（Monaco `addCommand`/`addAction` + 宿主键捕获层；需自研 Sublime `context` 条件引擎） | 需封装（`@codemirror/view` `keymap` + 自研 context 前置判断） | 需封装 | `@codemirror/view` / Monaco KeybindingService |
| Package Control | 需自研（channel/repository JSON 客户端 + 安装器(Git/zip) + 依赖解析 + 事件钩子） | 需自研 | 需自研 | `node-fetch`、`simple-git`、`adm-zip`/`extract-zip` |
| Python 插件 API | **较难**（Sublime 插件是 Python；需嵌入 Python 运行时(`python-build-standalone`/Pyodide) 或放弃 Python 兼容，改 JS 扩展宿主） | 较难 | 较难 | `python-build-standalone` / `pyodide`；或 Node `worker_threads` 扩展宿主 |
| TextMate 语法复用 | 需封装（`vscode-textmate` + `vscode-oniguruma`，即 `monaco-tm` 方案；`.sublime-syntax` 需转换器，`.tmLanguage` 直接可读） | **较难**（CM6 用 Lezer，无成熟 TextMate 桥；需自研 scope 高亮层或流式 tokenizer 桥） | **推荐路径**（独立 TextMate tokenizer 引擎，同时喂 Monaco/CM6，或 Monaco 直接 monaco-tm） | `vscode-textmate`、`vscode-oniguruma`、`onigasm`、`monaco-tm` |

---

## 3. 关键技术选型结论：Monaco Editor vs CodeMirror 6

### 3.1 逐项对比

| 维度 | Monaco Editor | CodeMirror 6 | 胜者 |
|---|---|---|---|
| 多光标 / 多选区 | 一等公民，Selection API、`addSelectionToNextFindMatch`、列选原生化完整 | 一等公民，状态驱动多 SelectionRange，但「多光标视觉效果」较弱（默认只高亮主选区） | 平手（Monaco 交互更贴 Sublime） |
| Minimap | **内置**，渲染/装饰/滚动一体化 | 无内置，依赖社区 `@replit/codemirror-minimap` | **Monaco** |
| 代码折叠 | 内置 `FoldingRangeProvider`，缩进/语法折叠 | 内置 `foldext`，官方完善 | 平手 |
| TextMate 语法复用 | **强**：`vscode-textmate`+`vscode-oniguruma`（`monaco-tm`）已成熟，`.tmLanguage` 直接复用，直接吃下 VS Code/Sublime 生态；`monarch` 为备选 | **弱**：原生 Lezer（增量 parser、性能好但语法要重写），TextMate 桥不成熟，`.tmLanguage`/`.sublime-syntax` 需大规模转换 | **Monaco**（决定性） |
| 自动补全 | 完善：provider 抽象、内联补全、kind/details、snippet | 完善：`@codemirror/autocomplete`，snippet 支持好 | 平手 |
| 性能（超大文件/长行） | 好，但长行/海量装饰下弱于 CM6；渲染管线黑盒，难微调 | **优**：增量状态 + 视口虚化，百万行/长行场景明显更快 | **CM6** |
| 包体积 | 较大（含语言/worker，gzip 主库数百 KB 级，全量更大） | **小**：核心 tree-shakable，按需加载，几十~百 KB 级 | **CM6** |
| 跨平台无障碍（a11y） | 有 Accessibility Guide，但 ARIA/读屏支持被长期诟病，定制 gutter 更难 | **强**：官方主打 screen reader / 键盘 / bidi / 移动端；ARIA 正确性更好 | **CM6** |
| 可定制/演进自由度 | 弱（VS Code 衍生物，`monaco.d.ts` 之外的内部私有不稳定） | **强**：全部基于公开 API，modular，可深度改造 | **CM6** |

### 3.2 明确推荐

**推荐：选 A —— Monaco Editor 为主（并复用 vscode-textmate + vscode-oniguruma）。**

理由：

1. **TextMate/Sublime 语法生态是 sample-text 的命根子。** Sublime 的核心资产是 `scope name` 语义、`.sublime-syntax`/`.tmLanguage`、`.tmTheme` 与海量社区主题/语法包。Monaco 经由 `vscode-textmate`+`vscode-oniguruma` 原样复用这套体系（VS Code 生产验证的路径），而 CM6 的 Lezer 让我方必须逐一重写语法、并放弃 scope 匹配的插件生态（如 BracketHighlighter、scope 定位补全、tmTheme 直接移植）。
2. **对 Sublime 交互的贴合度。** minimap 内置、列编辑/多光标/`addSelectionToNextFindMatch`、diff editor 内置、gutter decoration 丰富——这些是 Sublime 身份能力的直接等价物，Monaco 开箱度最高。
3. **生态复用面更大。** Monaco 与 VS Code 共享大量服务（LSP client、semantic token、`vscode-languageserver-*`），未来做 Goto Definition/Symbol 时可直接挂 LSP。
4. **CM6 的优势可以通过架构规避。** 性能/体积/a11y 是 CM6 的强项，但 sample-text 是桌面应用（Electron 自带 Chromium），体积压力低于 web 场景；性能可借助 worker 索引、虚拟化与限制超大文件；a11y 需专项投入（见下）。

**保留项（未来 C 路线）**：在诸如 Markdown/轻量纯文本、移动/嵌入式预览等不需要 TextMate scope 体系的场景，可引入 CM6 作为补充内核降低成本；但主编辑面以 Monaco 统一，避免维护两套编辑器心智。

---

## 4. 插件 / 包系统设计参考

### 4.1 Sublime 原机制（对标物）

- **包格式**：`.sublime-package`（即 zip）；也可松散目录；**松散目录同名校验覆盖 zip 内文件**——这是用户自定义覆盖内置行为的核心机制。
- **包排序合并**：`Default` 恒最先、`User` 恒最后，其余按字母序；`Main.sublime-menu`、键位、设置等按顺序合并。
- **分发**：Package Control 的 **channel**（顶层 URL→JSON，列出 repository 列表）→ **repository**（JSON，列出包元数据：schema_version/名称/平台/版本/下载 URL/labels）→ 客户端拉取安装；支持 GitHub/BitBucket tag 直装、依赖、`install/upgrade/remove` 事件。
- **插件 API**：Python；`sublime`（对象模型：Window/View/Buffer/Settings/Region/Phantom/Html/CompletionItem/Syntax…）+ `sublime_plugin`（`TextCommand`/`WindowCommand`/`ApplicationCommand`/`EventListener`/`ViewEventListener`/`TextChangeListener` + `*InputHandler`）；命令即「键位/菜单/palette 的字符串 → 类」绑定；`plugin_loaded/unloaded` 生命周期；线程安全 API。

### 4.2 sample-text 复刻方案（Electron：主进程 + 沙箱 renderer + worker）

借鉴 VS Code 的 **Extension Host 思路但更轻**，同时保留 Sublime「资源文件覆盖 + 包排序合并」语义：

```
┌─────────────────────────────────────────────────────────────┐
│ Electron 主进程 (Node, full trust)                            │
│  - 文件系统 / 项目 / Git / CLI / 单实例锁                       │
│  - Package Manager Service：channel/repository 拉取、安装(Git/  │
│    zip)、依赖解析、事件钩子、包激活/覆盖合并                     │
│  - IPC 网关：仅暴露白名单 RPC 给 renderer / plugin host          │
└──────────────┬──────────────────────────┬─────────────────────┘
               │ contextBridge (安全)       │
      ┌────────▼─────────┐        ┌────────▼──────────────────────┐
      │ Renderer (沙箱)    │        │ Plugin Host 进程/worker(独立)  │
      │  - Monaco/CM6 UI   │        │  - 沙箱化 Node worker 或孤立   │
      │  - UI 壳/分屏/tab   │        │    utilityProcess             │
      │  - command/键位     │        │  - 插件代码(JS/TS，或 Python    │
      │    (context 条件)   │        │    via python-build-standalone) │
      │ contextIsolation=on│        │  - LSP client / 语言特性       │
      │ nodeIntegration=off│        │  - 通过 postMessage/RPC 回调   │
      └────────────────────┘        └──────────────────────────────┘
```

关键设计决策：

1. **安全边界**：`contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`；主进程用 `contextBridge` 暴露最小 `api.*`（openFile/saveFile/spawnBuild/readDir…），绝不能把 Node 能力直接丢给 renderer；插件宿主用 Electron `utilityProcess`（比 `worker_threads` 更隔离、可限内存、可 crash 回收）。
2. **插件读写模型**：插件通过「资源层」声明式贡献——主题/配色/snippet/completions/键位/菜单（`.sublime-*` 同构 JSON/XML）；命令式逻辑用受限 API（编辑 Buffer、`on_query_completions`、`on_modified`、装饰、quick panel），经 RPC 序列化到 UI。**复制 Sublime 的「资源文件 + 排序合并覆盖」模型**（`default < 字母序 < user`），这是低成本高兼容的关键。
3. **Python 兼容分层可选**：默认插件写 JS/TS（Node worker），可选内嵌 `python-build-standalone` 提供 `.py` 插件的受限兼容层（初版不必做；留接口）。**首期不建议直接追求 Python 插件兼容**，成本极高。
4. **Package Control 复刻**：自研 `channel.json`(schema_version) + `repository.json` 客户端（Sublime 的 `channel_v3`/`repository` JSON 字段即可作为可直接兼容的 schema 参考，甚至可读社区 Bundles 的元数据）；Git clone + zip 解压安装；记录 installed.json；插件包依赖、升级、卸载事件。
5. **性能隔离**：索引用主进程/utilityProcess 后台低优先级跑（对齐 Sublime `index_workers`），结果以增量索引 + 倒排（符号表 / 词频）喂 renderer，避免阻塞 UI。

---

## 5. 权限 / 许可合规

### 5.1 依赖许可证（均兼容 MIT 项目）

| 依赖 | 许可证 | 备注 |
|---|---|---|
| Electron | **MIT** | 项目整体 MIT；内嵌 Chromium(BSD-3) 与 Node(MIT)；分发二进制需注意 Chromium 的第三方通知但无传染性 |
| Monaco Editor (`monaco-editor`) | **MIT** | 微软开源，可自由改/闭源/商用 |
| CodeMirror 6 (`codemirror` etc.) | **MIT** | 作者有「商业使用者社会性资助期望」，无法律强制 |
| `vscode-textmate` | **MIT** | 微软，TextMate 语法引擎 |
| `vscode-oniguruma` / `onigasm` | **MIT**（包装层） | 底层 Oniguruma 正则引擎为 **BSD-2-Clause**，需保留其版权声明（无 copyleft） |
| `electron-builder` | **MIT** | 打包/签名/公证工具链 |
| `electron-store` | **MIT** | 配置持久化 |
| `@monaco-editor/react` | **MIT** | React 绑定（可选） |
| `@replit/codemirror-minimap` | **MIT** | 若走 CM6 minimap |
| `@replit/codemirror-vim` | **MIT** | 若走 Vim 模式 |
| `simple-git` / `isomorphic-git` | **MIT** / **MIT** | Git 操作 |
| `fuse.js` | Apache-2.0（宽松，需保留声明） | 模糊匹配（可用 MIT 的 `fzf`/自研替代） |

**结论**：所有关键依赖均为宽松许可（MIT/BSD-2/Apache-2.0），无 GPL/LGPL/AGPL 传染风险，组合出 MIT 的 sample-text 合法。**动作项**：发行时附第三方 LICENSE 清单，尤其保留 Oniguruma 的 BSD-2 版权页（来自 `vscode-oniguruma`）。注意 `fuse.js` 为 Apache-2.0，若想纯 MIT 可换 `fzf-for-js`/`tinysearch`/自研。

### 5.2 无签名 / 自签名分发可行性

**macOS：**
- **可行**，但体验打折。未签名应用首次打开被 Gatekeeper 拦截（"无法验证开发者"），需用户右键 → 打开，或用 `xattr -dr com.apple.quarantine /Applications/sample-text.app` 绕过。
- **自签名（ad-hoc）**：`codesign --force --deep --sign - sample-text.app` 做本地/分发测试可抑制部分签名校验，但**无 Developer ID 仍会触发 Gatekeeper**。
- **正式顺畅分发**：需 Apple Developer 账号 + **Developer ID Application 证书 + notarization**（`xcrun notarytool submit ... --wait` + `stapler staple`）。无公证的 build 在联网机器上会被强化提示。
- **注意**：Electron 应用与框架需逐段签名（`--deep`/`--options runtime`），硬启签名（Hardened Runtime）与 entitlements（`com.apple.security.cs.allow-jit` 等）要配好，否则 V8 JIT 崩溃。

**Windows：**
- **可行**。未签名应用触发 SmartScreen（"Windows 已保护你的电脑"），用户点"更多信息 → 仍要运行"；或右键属性 → 解除锁定。
- **自签名证书**：默认不被信任（需用户手动导入受信任根，或加入企业策略），对开放分发意义有限；**Authenticode（OV/EV 证书）** 才可消除 SmartScreen 警告（EV 通常即时信誉，OV 需积累信誉）。
- **注意**：`electron-builder` 的 `win.certificateFile/Password` + `signtool` 即流程；未签名时确保 installer（NSIS）不因此失败。

**通用注意**：无签名不影响功能，但会影响自动更新（需自己实现更新源与校验）与用户信任；sample-text 作为开源项目可先无签名/自签名发布，待有资金再购买 Developer ID / OV 证书。

---

## 附：首期 MVP 最小可行切片 + 分期路线图

### MVP（约 500 字内的最小可行功能切片）

**一句话**：把 Sublime 的「编辑手感 + 项目导航 + 配置」这一最小闭环做扎实，其余交给后续版本。

- **编辑器核心（Monaco + monaco-tm）**：多光标/多选区、列编辑、Quick Add Next、代码折叠、内置 TextMate 语法高亮（`.tmLanguage` 直接复用 + `.tmTheme` 配色）、minimap、自动补全（当前文件单词 + snippet + completions 文件）。
- **导航**：文件树侧边栏、Goto File（模糊）、Goto Line、Goto Symbol（文件内，靠 DocumentSymbolProvider + LSP 预留）、单文件查找替换。
- **界面**：标签页 + 分屏（左右 1~2 栏）、状态栏（行列/语法/Git 分支）、极简 Command Palette。
- **配置**：`Settings JSON`（Default/User 两级合并起步）、`Key Bindings`（`.sublime-keymap` 子集 + 少量 context 条件）、`.sublime-snippet` 片段。
- **工程**：打开文件夹为项目、`.sublime-project` 读写（folders + settings）、基础 Build System（`cmd`/`shell_cmd` + `file_regex` 结果跳转）。
- **包管理最小版**：本地 loose package 目录加载 + 覆盖合并（先不做远程 channel）。
- **不纳入 MVP**：Python 插件 API、Vintage/Vim、增量 diff/Git hunk 回退、项目全局符号索引、远程 Package Control、免打扰、拼写检查。

### 分期路线图

1. **M0 原型（骨架）**：Electron + Monaco 单文件编辑、多光标、主题、键位基础、主进程渲染进程安全边界。
2. **M1 MVP**：上述 MVP 切片全部落地；`.sublime-snippet`/`.sublime-completions` 解析；TextMate 语法/主题导入打通。
3. **M2 项目与构建**：多文件夹 workspace、Goto Anything 全量、Build System 完整（variants/平台分支/取消）、Find in Files。
4. **M3 索引与智能**：后台符号/词频索引、Goto Symbol 全局、上下文补全、LSP 客户端（可选）。
5. **M4 插件系统**：`utilityProcess` 扩展宿主、资源覆盖合并模型、channel/repository 客户端、JS/TS 插件 API。
6. **M5 进阶对齐**：增量 diff + Git 状态/联动、Vim 模式、拼写检查、免打扰、分屏 grid、Tab Multi-Select。
7. **M6 分发**：electron-builder 签名/公证、自动更新、跨平台 CI，开源发布。

---