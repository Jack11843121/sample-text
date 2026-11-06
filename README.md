# sample-text

轻量、跨平台的**文本处理与代码编辑器**，开源免费（MIT）。

[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-blue)](#下载安装)
[![Version](https://img.shields.io/badge/Version-0.1.9-informational)](package.json)

> 一个为「快速查看 / 编写文本、Markdown 与代码」而生的桌面编辑器：启动快、界面干净，多光标、折叠、minimap、命令面板、插件系统等编辑能力齐全，安装即用、无授权烦恼。

---

## 这是什么

`sample-text` 是一个本地桌面编辑工具，覆盖从「顺手打开几行文本」到「日常写代码」的完整场景：

```
打开文件 / 文件夹 ──► sample-text ──► 编辑 / 高亮 / 多光标 / 查找替换
                         │
                         ├─ 语法高亮：50+ 语言 + 可导入第三方语法/配色
                         ├─ 导航：Goto Anything / Symbol / 项目符号索引
                         ├─ 分组分屏、标签页、侧边栏文件树
                         ├─ Git 状态与行级 diff 标记
                         ├─ 构建系统、宏、书签、Vim 模式
                         └─ 插件系统 + plugin.js 扩展
```

**核心理念**：*「轻、快、开箱即用，又能按需扩展」*。功能做在桌面端，配置走 JSON 分层，扩展走 `plugin.js` 与资源目录。

---

## 功能特性

### 编辑

- ✅ **多光标 / 多选区**：Quick Add Next / Skip Next / Find All / Undo Selection，`Esc` 一键收拢为单光标，效率对标专业编辑器。
- ✅ **列编辑**：`Option/Alt + 拖拽` 矩形选区；光标上下倍增、Split into Lines（选中多行拆成多光标）。
- ✅ **代码折叠与 Minimap**：按语法/缩进折叠，右侧文档缩略图可点跳转。
- ✅ **语法高亮**：内建 50+ 语言（JS/TS/Python/Java/Go/Rust/HTML/CSS/JSON/YAML/SQL…），并支持导入第三方语法与配色文件。
- ✅ **自动补全**：当前文件单词 + 代码片段 + 自定义补全词库 + 智能建议。
- ✅ **撤销 / 软撤销**：Undo Selection 只回退选区、不动文本。
- ✅ **常用文本操作**：缩进/撤销缩进、行块注释、复制/移动/删除/合并行、排序/去重/反转、大小写转换、重排缩进、缩进与空格互转。
- ✅ **书签**：Mark / Next / Prev / Select All（`⌘F2` / `F2` / `⇧F2`）。
- ✅ **Vim 模态编辑**：命令面板「Vim Mode」一键切换。

### 导航

- ✅ **Goto Anything**（`⌘P`）：文件模糊跳转。
- ✅ **Goto Symbol / Goto Line**（`⌘R` / `⌘G`）：当前文件符号、精确跳行。
- ✅ **Goto Symbol in Project**（`⌘⇧R`）：项目级符号索引。
- ✅ **查找 / 替换**（`⌘F` / `⌘H`）：正则、大小写、全词。
- ✅ **Find in Files**（`⌘⇧F`）：项目级正则搜索，结果面板点击跳转。
- ✅ **定义跳转**：Goto Definition / Reference / Peek（`F12` / `⇧F12`）、Rename Symbol。

### 界面

- ✅ **分屏编辑**：1 / 2 / 3 列、2 行布局，窗格焦点切换。
- ✅ **标签页**：脏标记、中键关闭、MRU 顺序、重开已关闭文件。
- ✅ **侧边栏文件树**：目录展开、Git 状态徽章、文本文件过滤、外部增删实时刷新。
- ✅ **状态栏**：行/列、选区数、宏录制、语法、缩进、编码、换行符、Git 分支。
- ✅ **命令面板**（`⌘⇧P`）：所有命令模糊检索执行。
- ✅ **配色方案**：内置深浅主题，可导入第三方配色。
- ✅ **拖放打开**文件/文件夹。

### 工程

- ✅ **项目**：打开文件夹作为项目，读取项目 `settings` / `build_systems`。
- ✅ **构建系统**：`cmd`/`shell_cmd`、`file_regex` 结果跳转、平台分支、变量展开、可取消。
- ✅ **命令行**：单实例锁定，二次调用聚焦已有窗口（macOS Finder 关联打开）。
- ✅ **Git 集成**：分支 / 暂存 / 未暂存 / 未跟踪 统计 + 行级 diff gutter 标记。

### 配置与扩展

- ✅ **分层配置**：Default → User → 项目，深合并，高优先级覆盖低优先级。
- ✅ **自定义键位**：支持二段和弦（如 `⌘K ⌘B`）与条件匹配。
- ✅ **代码片段 / 自定义补全**：XML 片段、JSON 补全词库。
- ✅ **宏**：录制 / 运行 / 保存。
- ✅ **包系统**：`Packages/` 资源目录自动加载。
- ✅ **插件 API**：`plugin.js` 注册命令、订阅事件（`file.open` / `file.save` / `view.activated`）。
- ✅ **会话记忆**：记住上次打开的文件夹与文件，重启自动恢复。
- ✅ **自动更新 / 包管理 / 拼写检查开关**。

---

## 下载安装

前往 [Releases](https://github.com/Jack11843121/sample-text/releases) 下载对应平台安装包：

| 平台 | 安装包 | 安装方式 |
|---|---|---|
| macOS（Apple Silicon） | `sample-text-0.1.9-mac-arm64.zip` | 解压后把 `sample-text.app` 拖入「应用程序」，首次打开需 **右键 → 打开** |
| Windows（x64） | `sample-text-0.1.9-win-x64.zip` | 解压后双击 `sample-text.exe`，SmartScreen 提示点「更多信息 → 仍要运行」 |

> 想要 `.dmg` / `.exe` 安装器？见下方「生成正式安装包」。

### 从源码运行

```bash
npm install
npm run dev
```

### 生成正式安装包

| 目标 | 命令 | 在哪台机器执行 |
|---|---|---|
| macOS `dmg`（Apple Silicon） | `npm run build:mac:arm64` | macOS（M 系列） |
| macOS `dmg`（Intel） | `npm run build:mac:x64` | macOS（Intel / Rosetta） |
| Windows `.exe`（NSIS） | `npm run build:win` | Windows 本机 |
| Windows 便携 `zip` | `npm run build:win:zip` | 任意机（含 macOS 交叉） |

产物统一输出到 `release/`。前置：macOS 需 Xcode 命令行工具（含 `hdiutil`）、Windows 需 Node.js ≥ 20。

---

## 快捷键速查

> `⌘` 为 macOS，Windows/Linux 请替换为 `Ctrl`。

| 功能 | mac | Windows/Linux |
|---|---|---|
| Goto Anything | `⌘P` | `Ctrl+P` |
| 命令面板 | `⌘⇧P` | `Ctrl+Shift+P` |
| Goto Symbol / Line | `⌘R` / `⌘G` | `Ctrl+R` / `Ctrl+G` |
| 打开文件 / 文件夹 | `⌘O` / `⌘⇧O` | `Ctrl+O` |
| 新建 / 保存 / 另存 | `⌘N` / `⌘S` / `⌘⇧S` | `Ctrl+N/S/Shift+S` |
| 查找 / 替换 | `⌘F` / `⌘H` | `Ctrl+F` / `Ctrl+H` |
| 多光标选中下一个 | `⌘D` | `Ctrl+D` |
| 复制/移动当前行 | `⌘⇧D` / `⌘⇧↑↓` | `Ctrl+Shift+D / ↑↓` |
| 缩进 / 撤销缩进 | `⌘]` / `⌘[` | `Ctrl+]` / `Ctrl+[` |
| 注释 / 块注释 | `⌘/` / `⌘⇧/` | `Ctrl+/` / `Ctrl+Shift+/` |
| 折叠 / 展开 | `⌥⌘[` / `⌥⌘]` | `Ctrl+Shift+[ / ]` |
| 分屏 1/2/3 列 | `⌘⌥1` / `⌘⌥2` / `⌘⌥3` | `Ctrl+Alt+1/2/3` |
| 侧边栏开关 | `⌘K ⌘B` | `Ctrl+K, Ctrl+B` |
| 转到定义 | `F12` | `F12` |
| 构建 | `⌘B` | `Ctrl+B` |

---

## 配置

配置采用分层合并，后者覆盖前者：

```
Default（内置默认） → User（用户） → 项目（项目的 settings 段）
```

| 配置 | 位置 |
|---|---|
| 用户设置 | `<用户数据目录>/sample-text/settings.json` |
| 用户键位 | `<用户数据目录>/sample-text/keymap.json` |
| 项目设置 | 项目文件的 `settings` 段 |

常用设置项（含默认值）：`font_size`、`tab_size`、`translate_tabs_to_spaces`、`word_wrap`、`minimap_enabled`、`fold_buttons`、`draw_white_space`、`highlight_line`、`spell_check`、`default_line_ending` 等。

---

## 插件与扩展

包位于 `<用户数据目录>/sample-text/Packages/`，启动时自动扫描并加载其中的代码片段、补全词库、配色、语法与插件脚本。

### 编写 plugin.js 插件（最小示例）

```js
// Packages/MyPlugin/plugin.js
api.addCommand({ command: 'hello', title: 'Hello World' }, () => {
  api.notify('你好，sample-text！')
})

api.on('file.open', (payload) => {
  api.notify('打开了 ' + payload.path)
})
```

可用的插件事件：`file.open`、`file.save`、`view.activated`。

---

## 从源码构建

```bash
npm install
npm run typecheck       # TypeScript 类型检查
npm run build           # 构建（主进程 + 渲染层）
npm run build:unpack    # 本地目录版（免安装验证）
```

目录结构：

```
sample-text/
├── src/
│   ├── shared/          # 跨进程类型、IPC 协议、模糊匹配、配置合并、键位解析
│   ├── main/            # Electron 主进程：文件系统/项目/构建/Git/更新/包管理
│   ├── preload/         # contextBridge 安全桥
│   └── renderer/        # React + Monaco UI：编辑器、命令面板、侧边栏等
├── electron-builder.yml # 打包配置
├── build/               # 图标、entitlements 等打包资源
└── docs/                # 调研与架构文档
```

---

## 定制开发 / 联系

本项目 MIT 开源、永久免费使用。

如需**定制开发**（新增语言特性、私有插件/主题、代码片段库、私有化打包部署、企业级自动更新、与团队工作流集成等），或需要**打包 + 部署 + 使用指导**，欢迎联系：

📞 **电话：15919897624**
📧 **邮箱：11843121@qq.com**

> 可提供：编辑器定制开发、插件/主题/片段定制、打包部署、使用指导等定制业务，费用很低。

---

## 许可

MIT © sample-text Contributors

第三方依赖均为宽松许可（MIT / BSD），详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。