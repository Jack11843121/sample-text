# sample-text

轻量、跨平台的文本处理与代码编辑器，开源免费（MIT）。

[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-blue)](#下载安装)
[![Version](https://img.shields.io/badge/Version-0.1.9-informational)](package.json)

- ⚡ **轻快**：基于 Electron + Monaco，启动即用、界面干净。
- 🖥️ **跨平台**：macOS（Apple Silicon / Intel）与 Windows（x64）。
- ✍️ **为文本而生**：t文本、Markdown、代码一视同仁，多光标、折叠、minimap 等编辑能力齐全。
- 🧩 **可扩展**：`plugin.js` 注册命令、订阅事件；JSON 分层配置 + 自定义键位。
- 🎨 **可换肤**：内置深浅主题，支持导入第三方语法与配色文件。

---

## 下载安装

前往 [Releases](https://github.com/Jack11843121/sample-text/releases) 下载对应平台安装包：

| 平台 | 安装包 | 安装方式 |
|---|---|---|
| macOS（Apple Silicon） | `sample-text-0.1.9-mac-arm64.zip` | 解压后把 `sample-text.app` 拖入「应用程序」，首次打开需 **右键 → 打开** |
| Windows（x64） | `sample-text-0.1.9-win-x64.zip` | 解压后双击 `sample-text.exe`，SmartScreen 提示点「更多信息 → 仍要运行」 |

> 想要 `.dmg` / `.exe` 安装器？见下方「生成正式安装包」。

### 生成正式安装包

| 目标 | 命令 | 在哪台机器执行 |
|---|---|---|
| macOS `dmg`（Apple Silicon） | `npm run build:mac:arm64` | macOS（M 系列） |
| macOS `dmg`（Intel） | `npm run build:mac:x64` | macOS（Intel / Rosetta） |
| Windows `.exe`（NSIS） | `npm run build:win` | Windows 本机 |
| Windows 便携 `zip` | `npm run build:win:zip` | 任意机（含 macOS 交叉） |

产物统一输出到 `release/`。前置：macOS 需 Xcode 命令行工具（含 `hdiutil`）、Windows 需 Node.js ≥ 20。

### 从源码运行

```bash
npm install
npm run dev
```

---

## 功能特性

### 编辑

- 多光标 / 多选区：Quick Add Next（`⌘D`）、Quick Skip Next（`⌘K,⌘D`）、Find All、Undo Selection（`⌘U`）
- 列编辑（`Option/Alt + 拖拽`）、光标上下倍增、Split into Lines
- 代码折叠、Minimap 缩略图、自动补全、撤销/软撤销
- 语法高亮：内建 50+ 语言，可导入第三方语法
- 常用文本操作：缩进、注释、复制/移动/删除/合并行、排序/去重/反转、大小写转换
- 书签（`⌘F2` / `F2` / `⇧F2`）、Vim 模态编辑

### 导航

- Goto Anything 文件跳转（`⌘P`）
- Goto Symbol / Goto Line / Goto Symbol in Project（`⌘R` / `⌘G` / `⌘⇧R`）
- 查找 / 替换（正则、大小写、全词）、Find in Files（结果可点击跳转）
- Goto Definition / Reference / Peek（`F12` / `⇧F12`）

### 界面

- 分屏（1/2/3 列、2 行）、标签页（脏标记、中键关闭、重开已关闭文件）
- 侧边栏文件树（目录展开、Git 状态徽章、文本文件过滤、实时刷新）
- 状态栏（行/列、选区数、语法、缩进、编码、换行符、Git 分支）
- 命令面板、深浅主题切换、拖放打开

### 工程

- 打开文件夹作为项目
- Build System（`cmd` / `shell_cmd`、结果跳转、平台分支、变量展开、可取消）
- 单实例 + 命令行打开文件
- Git 集成（状态 + 行级 diff gutter）

### 配置与扩展

- Settings 分层配置、自定义键位（支持二段和弦与条件匹配）
- 代码片段、自定义补全、宏（录制/运行/保存）
- 包系统 + `plugin.js` 插件 API
- 自动更新、包管理、拼写检查开关

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
| 转发定义 | `F12` | `F12` |
| 构建 | `⌘B` | `Ctrl+B` |

---

## 配置

配置采用分层合并，后者覆盖前者：

```
Default（内置默认） → User（用户） → 项目
```

| 配置 | 位置 |
|---|---|
| 用户设置 | `<用户数据目录>/sample-text/settings.json` |
| 用户键位 | `<用户数据目录>/sample-text/keymap.json` |
| 项目设置 | 项目文件的 `settings` 段 |

常用设置项（默认值）：字体大小、`tab_size`、`translate_tabs_to_spaces`、`word_wrap`、`minimap_enabled`、`fold_buttons`、`draw_white_space`、`highlight_line`、`spell_check` 等。

---

## 插件与扩展

包位于 `<用户数据目录>/sample-text/Packages/`，支持松散目录形式。启动时自动加载：

- 代码片段 / 补全词库
- 配色方案 / 语法定义
- `plugin.js` 插件脚本

### 编写 plugin.js 插件（最小示例）

```js
// Packages/MyPlugin/plugin.js
api.addCommand({ command: 'hello', title: 'Hello' }, () => {
  api.notify('你好，sample-text！')
})

api.on('file.open', (payload) => {
  api.notify('打开了 ' + payload.path)
})
```

---

## 从源码构建

```bash
npm install
npm run typecheck       # 类型检查
npm run build           # 构建
npm run build:unpack    # 本地目录版
```

---

## 许可

MIT © sample-text Contributors

第三方依赖均为宽松许可（MIT / BSD），详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。