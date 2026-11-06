# sample-text 架构设计

## 三层进程模型

```
┌─────────────────────────────────────────────────────────────┐
│ Electron 主进程 (Node, 完全信任)                              │
│  index.ts      应用生命周期、单实例锁、CLI、macOS open-file   │
│  menu.ts       原生菜单 → IPC 转发命令                        │
│  ipc.ts        IPC 网关（仅注册白名单 RPC）                   │
│  services/     filesystem · project · build · git · search   │
│                packages · settings-store                     │
└───────────────┬─────────────────────────────────────────────┘
                │ contextBridge（仅暴露 window.openSublime）
┌───────────────▼─────────────────────────────────────────────┐
│ Preload（沙箱）                                              │
│  仅通过 ipcRenderer.invoke 转发，无 Node 能力外泄            │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│ Renderer（contextIsolation + sandbox，React）                │
│  store.ts          应用状态（单一 store，useSyncExternalStore）│
│  editor/session.ts Monaco 模型/编辑器实例管理（分组级）      │
│  editor/            monacoSetup(workers/主题) · languages     │
│  commands/          registry + editorCommands + appCommands   │
│  keybindings/       默认键位 + 全局 keydown 匹配 + context     │
│  features/          completions(.sublime-snippet/.completions)│
│  components/        TabBar · Sidebar · StatusBar · 面板       │
│  CommandPalette     command/file/symbol/line/snippet 五合一    │
└─────────────────────────────────────────────────────────────┘
```

## 关键设计决策

1. **安全边界**：`contextIsolation: true` + `sandbox: true` + `nodeIntegration: false`。
   渲染层只能调用 `window.openSublime` 暴露的白名单方法；主进程只注册已知 channel 的 `ipcMain.handle`。

2. **多光标/分屏与模型的分离**：Monaco 模型以「文件路径」为键（`session.ts : models`），
   编辑器实例以「分组 id」为键（`: editors`）。分屏 = 多编辑器实例共享模型；标签 = 打开模型的路径集合。

3. **命令系统**：`registerCommand(name, handler)` + 元数据（title/category）供命令行面板使用。
   编辑器原生命令直接 `editor.trigger(monacoActionId)`，Sublime 特有命令（quick_add_next、undo_selection 等）自定义实现。

4. **键位系统**：`@shared/keybinding` 解析 `.sublime-keymap` 语法（primary/ctrl+alt 等），
   支持二段和弦（`ctrl+k, ctrl+b`）与 context 条件（`num_selections`/`selector`/`panel`）。
   渲染层全局 capture 阶段监听，命中即 `preventDefault` 并分发。

5. **设置分层合并**：`@shared/settings.mergeSettings(Default, User, Project)` 深合并，
   `null` 表示删除键。用户设置在 `userData/sample-text/Preferences.sublime-settings` 持久化。

## 数据流样例

- **打开文件**：拖放/对话框/命令 → `io.openFile(path)` → 主进程 `fs.readFile`（编码/EOL 检测）
  → `store.setDocument` → `EditorPane` 将模型 attach 到对应分组的 Monaco 实例。
- **保存**：`io.saveActive` → 读取模型值 → `fs.writeFile`（按 settings 做 EOL/末尾换行处理）
  → `store.markSaved`。
- **构建**：命令 → `io`/`appCommands` 收集 build system → 主进程 `build.ts` spawn shell，
  逐行输出经 `IPC.BUILD_OUTPUT` 推流，`file_regex` 解析为可点击结果。

## 扩展点（后续里程碑）

- **插件宿主**：新增 `main/services/plugins.ts`，用 `utilityProcess` 隔离运行 JS 扩展，
  经 postMessage RPC 回调编辑 API。
- **包管理**：`packages.ts` 已实现 loose 资源扫描；channel/repository 客户端与
  `.sublime-package`(zip) 解压安装待实现。
- **边缘能力**：Vim/Vintage、拼写检查、自动更新、应用图标。

> TextMate 语法引擎（`.tmLanguage` → Monaco token provider）与
> `.tmTheme`/`.sublime-color-scheme` 配色导入已在 `editor/textmate.ts`、`features/themes.ts` 落地。