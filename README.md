# sample-text

轻量、跨平台的文本处理与代码编辑器，功能对标 [Sublime Text](https://www.sublimetext.com/) 的大部分核心能力，但更轻、零授权烦恼。

[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-blue)](#快速开始)
[![Version](https://img.shields.io/badge/Version-0.1.0-informational)](package.json)
[![Build](https://img.shields.io/badge/Build-passing-brightgreen)](#从源码构建与打包)

- ⚡ **技术栈**：Electron + Monaco Editor + `vscode-textmate`（复用 TextMate 语法 / 配色生态），UI 层 React。
- 🖥️ **跨平台**：macOS（Intel + Apple Silicon）与 Windows（x64）。
- 🎨 **生态兼容**：直接加载 `.sublime-snippet` / `.sublime-completions` / `.tmLanguage` / `.tmTheme`。
- 🧩 **可扩展**：`plugin.js` 注册命令、订阅事件，JSON 分层配置 + `.sublime-keymap` 键位。
- 🌏 **开源免费**：MIT 许可，界面中文优先。

---

## 快速开始

### 下载安装（推荐）

前往 [Releases](https://github.com/Jack11843121/sample-text/releases) 下载对应平台安装包：

| 平台 | 安装包 | 安装方式 |
|---|---|---|
| macOS（Apple Silicon） | `sample-text-0.1.6-mac-arm64.zip` | 解压后把 `sample-text.app` 拖入「应用程序」。未签名，首次打开需 **右键 → 打开**（或 `xattr -dr com.apple.quarantine /Applications/sample-text.app`） |
| Windows（x64） | `sample-text-0.1.6-win-x64.zip` | 解压后双击 `sample-text.exe`。SmartScreen 提示时点「更多信息 → 仍要运行」 |

### 生成正式安装包（`.dmg` / `.exe`）

想要更正式的拖拽安装 `dmg` 或 `exe` 安装器？在**对应系统本机**执行一条命令即可：

| 目标产物 | 命令 | 在哪台机器执行 |
|---|---|---|
| macOS `dmg`（Apple Silicon） | `npm run build:mac:arm64` | macOS（M 系列芯片） |
| macOS `dmg`（Intel） | `npm run build:mac:x64` | macOS（Intel / 有 Rosetta） |
| Windows NSIS `.exe` 安装器 | `npm run build:win` | Windows 本机 |
| Windows 便携 `zip` | `npm run build:win:zip` | 任意机（含 macOS 交叉） |

产物统一输出到 `release/` 目录。前置条件：

- **macOS**：安装 Xcode 命令行工具（`xcode-select --install`，需含 `hdiutil`）。
- **Windows**：Node.js ≥ 20。
- 首次打包会自动下载 Electron / electron-builder 二进制；国内网络可在命令前加 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`。

> **为什么仓库的 Releases 里是 `zip` 便携包而不是 `.dmg`/`.exe`？**
> `.dmg` 依赖 macOS 自带的 `hdiutil`、`.exe` 的 NSIS 依赖 `makensis`（x86_64 二进制），二者都无法在无图形界面的 CI 或 arm64 交叉环境生成，因此仓库直接发布的是免安装 zip。按上表在对应系统本机跑一条命令即可产出正式安装器。

### 从源码运行

前置条件：Node.js ≥ 20、npm ≥ 10。

```bash
npm install        # 安装依赖（含 Electron 二进制）
npm run dev        # 开发模式（热更）
```

---

## 功能特性

### 编辑核心

| 特性 | 说明 |
|---|---|
| 多光标 / 多选区 | Quick Add Next（`⌘D`）、Quick Skip Next（`⌘K,⌘D`）、Find All（`⌥F3` / `⌘⌥G`）、Undo Selection（`⌘U`）、`Esc` 收拢为单光标 |
| 列编辑 | `Option/Alt + 拖拽`矩形选区；光标行上下倍增（`⌘⌥↑/↓`）、Split into Lines（`⌘⇧L`） |
| 代码折叠 | FoldingRange + 缩进折叠；折叠/展开/折叠全部/展开全部（`⌘K,⌘1` / `⌘K,⌘0`） |
| Minimap | 缩略图，可在设置中开关 |
| 语法高亮 | 内建 50+ 语言（Monarch）+ TextMate `.tmLanguage` 引擎（`vscode-textmate` + oniguruma），配合 `.tmTheme` 精确 scope 着色 |
| 自动补全 | Monaco 默认 + 当前文件单词 + snippet / `.sublime-completions` 建议 |
| 撤销 / 重做 | 标准撤销栈 + Undo Selection 软撤销（仅回退选区操作） |
| 常用文本操作 | 缩进、行/块注释、复制/移动/删除/合并行、排序/去重/反转、大小写转换、重排缩进 |
| 书签 | Mark / Next / Prev / Select All / Clear（`⌘F2` / `F2` / `⇧F2`） |
| Vim / Vintage | 模态编辑（`monaco-vim`，命令面板「Vim Mode」切换） |

### 导航

| 特性 | 说明 |
|---|---|
| Goto Anything | 文件模糊跳转（`⌘P` / `Ctrl+P`） |
| Goto Symbol / Goto Line | 文件内符号（`⌘R`）、跳行（`⌘G`） |
| Goto Symbol in Project | 项目级符号索引（`⌘⇧R`） |
| Find / Replace | 单文件查找替换，支持正则、大小写、全词 |
| Find in Files | 项目级正则搜索，结果面板可点击跳转 |
| 定义与重构 | Goto Definition（`F12`）、Goto Reference（`⇧F12`）、Peek Definition、Rename Symbol |

### 界面

| 特性 | 说明 |
|---|---|
| 分屏编辑 | 1 列 / 2 列 / 3 列 / 2 行布局，窗格焦点切换 |
| 标签页 | 脏标记、中键关闭、MRU 顺序、重开已关闭文件 |
| 侧边栏 | 文件树（目录展开、Git 状态徽章）、Reveal in Side Bar |
| 状态栏 | 行/列、选区数、宏录制、语法、缩进、编码、换行符、Git 分支 |
| 命令面板 | Command Palette，模糊匹配所有命令 |
| 配色方案 | 内置深浅主题 + `.sublime-color-scheme` / `.tmTheme` 导入切换 |
| 其他 | 拖放打开文件/文件夹、免打扰模式（`⌘⇧F11`） |

### 工程

| 特性 | 说明 |
|---|---|
| 项目 | 打开文件夹作为项目、读取 `.sublime-project`（folders / settings / build_systems） |
| Build System | `cmd` / `shell_cmd`、`file_regex` 结果跳转、平台分支、变量展开（`$file` 等）、可取消 |
| 命令行 | 单实例 + 打开文件（macOS Finder 关联） |
| Git 集成 | 状态（分支 / staged / unstaged / untracked）+ 行级 diff gutter |

### 配置与扩展

| 特性 | 说明 |
|---|---|
| Settings JSON | 分层合并（Default → User → 项目），字号/换行/行号/空白符等常用开关 |
| Key Bindings | `.sublime-keymap` 语法子集 + context 条件 + 二段和弦 |
| 片段与补全 | `.sublime-snippet` / `.sublime-completions` 加载 |
| 宏 | 录制 / 运行 / 保存（`.sublime-macro`） |
| 包系统 | Packages 目录扫描 + 资源覆盖合并（loose） |
| JS 插件 | `plugin.js` 注册命令 / 订阅事件（`file.open` / `file.save` / `view.activated`） |

---

## 快捷键速查表

> 键位约定：`primary` 在 macOS 为 `⌘`、在 Windows/Linux 为 `Ctrl`；`⌃` = Control、`⌥` = Option/Alt、`⇧` = Shift。二段和弦以 `,` 分隔表示「依次按下」。

### 导航面板 / 文件

| 功能 | macOS | Windows/Linux |
|---|---|---|
| Goto Anything | `⌘P` | `Ctrl+P` |
| Command Palette（命令面板） | `⌘⇧P` | `Ctrl+Shift+P` |
| Goto Symbol | `⌘R` | `Ctrl+R` |
| Goto Symbol in Project | `⌘⇧R` | `Ctrl+Shift+R` |
| Goto Line | `⌘G` | `Ctrl+G` |
| 打开文件… | `⌘O` | `Ctrl+O` |
| 新建文件 | `⌘N` | `Ctrl+N` |
| 新建窗口 | `⌘⇧N` | `Ctrl+Shift+N` |
| 保存 | `⌘S` | `Ctrl+S` |
| 另存为… | `⌘⇧S` | `Ctrl+Shift+S` |
| 全部保存 | `⌘⌥S` | `Ctrl+Alt+S` |
| 关闭文件 | `⌘W` | `Ctrl+W` |
| 重开已关闭文件 | `⌘⇧T` | `Ctrl+Shift+T` |

### 查找

| 功能 | macOS | Windows/Linux |
|---|---|---|
| 查找… | `⌘F` | `Ctrl+F` |
| 替换… | `⌘H` | `Ctrl+H` |
| 在文件中查找… | `⌘⇧F` | `Ctrl+Shift+F` |
| 下一个匹配 | `F3` | `F3` |
| 上一个匹配 | `⇧F3` | `Shift+F3` |
| 查找全部 | `⌥F3` / `⌘⌥G` | `Alt+F3` / `Ctrl+Alt+G` |

### 多光标 / 选择

| 功能 | macOS | Windows/Linux |
|---|---|---|
| Quick Add Next | `⌘D` | `Ctrl+D` |
| Quick Skip Next | `⌘K, ⌘D` | `Ctrl+K, Ctrl+D` |
| Undo Selection | `⌘U` | `Ctrl+U` |
| 收拢为单光标 | `Esc` | `Esc` |
| 展开选区到行 | `⌘L` | `Ctrl+L` |
| Split into Lines | `⌘⇧L` | `Ctrl+Shift+L` |
| 上行加光标 | `⌘⌥↑` / `⌘⌃↑` | `Ctrl+Alt+↑` |
| 下行加光标 | `⌘⌥↓` / `⌘⌃↓` | `Ctrl+Alt+↓` |
| 跳到括号 | `⌘M` | `Ctrl+M` |
| 展开选区到标签 | `⌘⇧A` | `Ctrl+Shift+A` |

### 编辑

| 功能 | macOS | Windows/Linux |
|---|---|---|
| 撤销 | `⌘Z` | `Ctrl+Z` |
| 重做 | `⌘⇧Z` | `Ctrl+Shift+Z` |
| Redo or Repeat | `⌘Y` | `Ctrl+Y` |
| 剪切 | `⌘X` | `Ctrl+X` |
| 复制 | `⌘C` | `Ctrl+C` |
| 粘贴 | `⌘V` | `Ctrl+V` |
| 全选 | `⌘A` | `Ctrl+A` |
| 复制行 | `⌘⇧D` | `Ctrl+Shift+D` |
| 上移行 | `⌘⇧↑` | `Ctrl+Shift+↑` |
| 下移行 | `⌘⇧↓` | `Ctrl+Shift+↓` |
| 合并行 | `⌘J` | `Ctrl+J` |
| 缩进 | `⌘]` | `Ctrl+]` |
| 反缩进 | `⌘[` | `Ctrl+[` |
| 切换行注释 | `⌘/` | `Ctrl+/` |
| 切换块注释 | `⌘⇧/` | `Ctrl+Shift+/` |
| 删除行 | `⌃⇧K` | `Ctrl+Shift+K` |
| 排序行 | `F9` | `F9` |

### 折叠 / 大小写

| 功能 | macOS | Windows/Linux |
|---|---|---|
| 折叠 | `⌃⇧[` | `Ctrl+Shift+[` |
| 展开 | `⌃⇧]` | `Ctrl+Shift+]` |
| 展开全部 | `⌘K, ⌘0` | `Ctrl+K, Ctrl+0` |
| 折叠全部 | `⌘K, ⌘1` | `Ctrl+K, Ctrl+1` |
| 转大写 | `⌘K, ⌘U` | `Ctrl+K, Ctrl+U` |
| 转小写 | `⌘K, ⌘L` | `Ctrl+K, Ctrl+L` |

### 书签 / 布局

| 功能 | macOS | Windows/Linux |
|---|---|---|
| 切换书签 | `⌘F2` | `Ctrl+F2` |
| 下一书签 | `F2` | `F2` |
| 上一书签 | `⇧F2` | `Shift+F2` |
| 清除全部书签 | `⌘⇧F2` | `Ctrl+Shift+F2` |
| 单列布局 | `⌘⌥1` | `Ctrl+Alt+1` |
| 双列布局 | `⌘⌥2` | `Ctrl+Alt+2` |
| 三列布局 | `⌘⌥3` | `Ctrl+Alt+3` |
| 切换侧边栏 | `⌘K, ⌘B` | `Ctrl+K, Ctrl+B` |
| 焦点到左窗格 | `⌃⇧←` | `Ctrl+Shift+←` |
| 焦点到右窗格 | `⌃⇧→` | `Ctrl+Shift+→` |
| 上一个窗格 | `⌃PgUp` | `Ctrl+PageUp` |
| 下一个窗格 | `⌃PgDn` | `Ctrl+PageDown` |
| 免打扰模式 | `⌘⇧F11` | `Ctrl+Shift+F11` |

### 视图 / 构建 / 定义

| 功能 | macOS | Windows/Linux |
|---|---|---|
| 切换自动换行 | `⌥Z` | `Alt+Z` |
| 增大字号 | `⌘=` | `Ctrl+=` |
| 减小字号 | `⌘-` | `Ctrl+-` |
| 构建 | `⌘B` | `Ctrl+B` |
| 显示构建结果 | `⌘⇧B` | `Ctrl+Shift+B` |
| Goto Definition | `F12` | `F12` |
| Goto Reference | `⇧F12` | `Shift+F12` |
| Goto Definition（快速） | `⌘F12` | `Ctrl+F12` |

> 以上键位全部来自 `src/renderer/keybindings/defaults.ts`，可通过 Command Palette 的「Preferences: Key Bindings」打开用户键位文件覆盖。

---

## 配置

### 分层合并

Settings 采用 Sublime 风格的分层深合并，层级由低到高：

`Default（内置默认） → User（用户） → 项目（.sublime-project 的 settings 段）`

- 对象递归深合并；数组与原始值整体替换；值为 `null` 表示「删除该键」。
- 用户设置文件允许 `//` 注释与尾逗号（宽松解析）。

### 文件位置

| 文件 | 位置 | 打开方式 |
|---|---|---|
| 用户设置 | `<用户数据目录>/sample-text/Preferences.sublime-settings` | 命令面板「Preferences: Settings」 |
| 用户键位 | `<用户数据目录>/sample-text/Default.sublime-keymap` | 命令面板「Preferences: Key Bindings」 |
| 项目设置 | `.sublime-project` 的 `settings` 段 | 命令面板「Project: Edit Settings」 |

### 常用设置项（默认值）

| 设置项 | 默认值 | 说明 |
|---|---|---|
| `font_size` | `13` | 字号 |
| `font_face` | `monospace` | 字体 |
| `tab_size` | `4` | Tab 宽度 |
| `translate_tabs_to_spaces` | `true` | Tab 转空格 |
| `detect_indentation` | `true` | 自动检测缩进 |
| `auto_indent` | `true` | 自动缩进 |
| `word_wrap` | `false` | 自动换行 |
| `render_line_numbers` | `true` | 行号 |
| `draw_white_space` | `none` | 空白符显示（`none` / `all`） |
| `highlight_line` | `false` | 高亮当前行 |
| `minimap_enabled` | `true` | MiniMap |
| `fold_buttons` | `true` | 折叠按钮 |
| `show_tabs` / `show_status_bar` | `true` / `true` | 标签页 / 状态栏 |
| `color_scheme_dark` | `sample-text Dark` | 暗色配色 |
| `color_scheme_light` | `sample-text Light` | 亮色配色 |
| `theme` | `sample-text.sublime-theme` | UI 主题 |
| `ensure_newline_at_eof_on_save` | `true` | 保存时末尾补换行 |
| `index_exclude_patterns` | `["node_modules", ".git"]` | 索引排除目录 |
| `ignored_packages` | `[]` | 禁用指定包 |
| `default_line_ending` | `system` | 换行符 |

完整默认值见 `src/renderer/store.ts` 的 `DEFAULT_SETTINGS`。

---

## 包与插件

### Packages 目录结构

包位于 `<用户数据目录>/sample-text/Packages/`，支持**松散目录**（loose）与 `.sublime-package` 文件两种形式：

```
Packages/
├── User/                      # 恒最高优先级（最后覆盖）
│   ├── Preferences.sublime-settings
│   └── my.sublime-snippet
├── MyTheme/                   # 其它包按字母序
│   ├── My.tmTheme
│   └── plugin.js
└── SomePackage.sublime-package
```

- 覆盖顺序：非 `User` 包按字母序在前，`User` 恒最后（最终生效）。
- 启动时自动扫描并加载 `.sublime-snippet`、`.sublime-completions`、`.sublime-color-scheme`、`.tmTheme`、`.tmLanguage` 与 `plugin.js`。

### 安装资源文件

把文件放入 Packages 下的任意子目录（或无子目录时即视为 `User` 包），重启或重载后生效：

| 文件类型 | 用途 | 说明 |
|---|---|---|
| `*.sublime-snippet` | 代码片段 | XML 格式，支持 `tabTrigger` / `scope` / 字段 `$1`、`$0` |
| `*.sublime-completions` | 补全词库 | JSON 格式 |
| `*.tmLanguage` | 语法高亮 | TextMate 语法（**JSON 格式**，plist 格式暂不支持） |
| `*.tmTheme` | 配色 | TextMate 配色方案 |
| `*.sublime-color-scheme` | 配色 | Sublime 配色方案 |
| `plugin.js` | 插件 | 见下方插件示例 |

### 编写 plugin.js 插件

每个包目录下可放一个 `plugin.js`，经约定的全局 `api` 贡献命令、订阅事件（信任模型与 Sublime 一致：用户安装的包即受信代码，进程内运行）。

```javascript
// Packages/MyPlugin/plugin.js

// 1) 注册命令，随后即可在命令面板中调用、也可绑定快捷键
api.registerCommand(
  { command: 'hello_world', title: 'Hello World', category: 'My Plugin' },
  () => api.notify('Hello, sample-text!')
)

// 2) 订阅 file.open 事件
api.on('file.open', (payload) => {
  api.log('打开文件：', payload.path)
})

// 可用事件：'file.open' | 'file.save' | 'view.activated'
// 其他 API：api.notify(msg, timeout) / api.log(...) /
//           api.store.getSetting(key, fallback) / api.store.run(command, args)
```

配上键位即可一键触发：

```jsonc
// Packages/User/Default.sublime-keymap
{ "keys": ["ctrl+shift+h"], "command": "hello_world" }
```

---

## 从源码构建与打包

```bash
npm run typecheck       # TypeScript 类型检查
npm run build           # 构建（electron-vite build）
npm run build:unpack    # 本地目录版（免安装，快速验证），产物 release/
```

| 脚本 | 说明 |
|---|---|
| `npm run dev` | 开发模式（热更） |
| `npm run dev:web` | 仅渲染层（renderer）开发，便于调试 UI |
| `npm run build` | 构建为主进程 + 渲染层产物 |
| `npm run typecheck` | 类型检查（node + web 两套 tsconfig） |
| `npm run preview` | 预览构建产物 |
| `npm run build:mac` | macOS，产出 x64 + arm64 的 `.dmg` 与 `.zip` |
| `npm run build:mac:x64` | 仅 macOS x64 |
| `npm run build:mac:arm64` | 仅 macOS arm64 |
| `npm run build:win` | Windows NSIS 安装器（需 Windows 本机） |
| `npm run build:win:zip` | Windows 便携 zip（可跨平台生成） |
| `npm run build:unpack` | 本地目录版（免安装快速验证） |

> 产物统一输出到 `release/`。

**实测结论（Windows NSIS）**：`zip` 便携包可在 macOS(aarch64) 交叉生成，解压后双击 `sample-text.exe` 即可运行；而 `NSIS` 安装器**需在 Windows 本机生成** —— `makensis` 预编译二进制为 x86_64，arm64 Mac（无 Rosetta）会报 `Bad CPU type`，请在有 Rosetta 的 x64 Mac 或 Windows 本机执行 `npm run build:win`。

签名 / 公证 / 无签名分发注意详见 [docs/03-build-and-distribution.md](docs/03-build-and-distribution.md)。

---

## 目录结构

```
sample-text/
├── src/
│   ├── shared/          # 跨进程契约：类型、IPC 协议、fuzzy、settings 合并、键位/context
│   ├── main/            # Electron 主进程：单实例、菜单、IPC 网关
│   │   └── services/    #   filesystem · project · build · git · search · packages · settings-store
│   ├── preload/         # contextBridge 安全桥（仅白名单 RPC）
│   └── renderer/        # React + Monaco UI
│       ├── commands/    #   registry + editorCommands + appCommands
│       ├── editor/      #   session / textmate / languages / monacoSetup
│       ├── features/    #   completions / themes / bookmarks / gitGutter / vim…
│       ├── keybindings/ #   defaults + 全局 keydown 匹配 + context
│       ├── plugins/     #   JS 插件宿主（plugin.js）
│       ├── components/  #   TabBar · Sidebar · StatusBar · 面板等
│       ├── store.ts     #   应用状态（单一 store）
│       └── App.tsx
├── docs/                # 调研与架构文档
├── build/               # 打包资源（icon、entitlements）
├── scripts/             # 辅助脚本（gen-icon.mjs）
├── electron-builder.yml # 打包配置
└── electron.vite.config.ts
```

---

## 开源许可

本项目以 [MIT License](LICENSE) 发布，© sample-text Contributors，开源免费，可自由修改 / 商用。

所有第三方依赖均为宽松许可（MIT / BSD-2 / Apache-2.0），无 GPL 系传染风险。完整清单与需保留的版权声明（含 Oniguruma 的 BSD-2 版权页）见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

---

## TODO / 路线图

当前版本已对齐 Sublime 大部分核心能力，以下为仍未完成的可选增强项：

- **拼写检查**：基于 Hunspell / Electron spellchecker 的 `.dic` 词典支持；
- **远程包自动安装**：Package Control 式的 `channel` / `repository` 云端拉取（当前仅支持本地松散目录扫描）；
- **自动更新**：接入更新服务器并做增量校验（当前未配置更新源，`electron-updater` 通道为预留）。

更完整的能力对标与分期路线图见 [docs/01-sublime-feature-research.md](docs/01-sublime-feature-research.md)。