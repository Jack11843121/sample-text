import {
  registerCommand,
  registerCommandMeta,
  runCommand,
  setMacroRecordSink,
  type CommandMeta,
  type MacroEntry
} from './registry'
import { store } from '../store'
import {
  closeActive,
  closePath,
  loadProjectFile,
  openFile,
  openFolder,
  refreshGitState,
  saveActive,
  saveActiveAs,
  saveAll
} from '../io'
import { getFocusedEditor, getFocusedPath, revealLineInEditor } from '../editor/session'
import { toggleVim } from '../features/vim'
import { IPC, type BuildSystem } from '@shared/types'

const api = window.sampleText

function reg(meta: CommandMeta, handler: () => void | Promise<void>): void {
  registerCommand(meta.command, () => void handler())
  registerCommandMeta(meta)
}

// ---------------------------------------------------------------------------
// 文件
// ---------------------------------------------------------------------------
reg({ command: 'new_file', title: 'New File', category: 'File' }, () => {
  store.newUntitled()
})
reg({ command: 'open_file_dialog', title: 'Open File…', category: 'File' }, async () => {
  const r = await api.openDialog()
  for (const p of r.paths) await openFile(p)
})
reg({ command: 'open_folder_dialog', title: 'Open Folder…', category: 'File' }, async () => {
  const r = await api.openFolderDialog()
  if (r.paths.length > 0) await openFolder(r.paths[0])
})
reg({ command: 'save', title: 'Save', category: 'File' }, async () => {
  await saveActive()
})
reg({ command: 'save_as', title: 'Save As…', category: 'File' }, async () => {
  await saveActiveAs()
})
reg({ command: 'save_all', title: 'Save All', category: 'File' }, async () => {
  await saveAll()
})
reg({ command: 'close_file', title: 'Close File', category: 'File' }, () => closeActive())
reg({ command: 'close_other_files', title: 'Close Other Files', category: 'File' }, () => {
  const active = store.getState().activePath
  for (const p of [...store.getState().tabOrder]) {
    if (p !== active) closePath(p)
  }
})
reg({ command: 'reopen_last_file', title: 'Reopen Closed File', category: 'File' }, async () => {
  const closed = store.popClosedFile()
  if (closed) await openFile(closed)
})
reg({ command: 'new_window', title: 'New Window', category: 'File' }, async () => {
  await api.openInNewWindow()
})

// ---------------------------------------------------------------------------
// 面板 / 导航
// ---------------------------------------------------------------------------
reg({ command: 'show_command_palette', title: 'Command Palette…', category: 'Tools' }, () => {
  store.openPalette('command')
})
reg({ command: 'show_goto_anything', title: 'Goto Anything…', category: 'Goto' }, () => {
  store.openPalette('file')
})
reg({ command: 'show_goto_symbol', title: 'Goto Symbol…', category: 'Goto' }, () => {
  store.openPalette('symbol')
})
reg({ command: 'show_goto_symbol_project', title: 'Goto Symbol in Project…', category: 'Goto' }, () => {
  store.openPalette('symbol_project')
})
reg({ command: 'show_goto_line', title: 'Goto Line…', category: 'Goto' }, () => {
  store.openPalette('line')
})
reg({ command: 'show_find', title: 'Find…', category: 'Find' }, () => {
  const ed = getFocusedEditor()
  ed?.trigger('keyboard', 'actions.find', null)
})
reg({ command: 'show_replace', title: 'Replace…', category: 'Find' }, () => {
  const ed = getFocusedEditor()
  ed?.trigger('keyboard', 'editor.action.startFindReplaceAction', null)
})
reg({ command: 'find_in_files', title: 'Find in Files…', category: 'Find' }, () => {
  store.setFindInFilesOpen(true)
})
reg({ command: 'use_selection_for_find', title: 'Use Selection for Find', category: 'Find' }, () => {
  const ed = getFocusedEditor()
  ed?.trigger('keyboard', 'editor.action.addSelectionToNextFindMatch', null)
})

// ---------------------------------------------------------------------------
// 视图 / 布局
// ---------------------------------------------------------------------------
reg({ command: 'toggle_sidebar', title: 'Toggle Side Bar', category: 'View' }, () => store.toggleSidebar())
reg({ command: 'toggle_minimap', title: 'Toggle Minimap', category: 'View' }, () => store.toggleMinimap())
reg({ command: 'toggle_status_bar', title: 'Toggle Status Bar', category: 'View' }, () => store.toggleStatusBar())
reg({ command: 'toggle_tabs', title: 'Toggle Tabs', category: 'View' }, () => store.toggleTabs())
reg({ command: 'toggle_distraction_free', title: 'Distraction Free Mode', category: 'View' }, () =>
  store.toggleDistractionFree()
)
reg({ command: 'set_layout_1col', title: 'Layout: Single', category: 'View' }, () => store.setLayout('1col'))
reg({ command: 'set_layout_2col', title: 'Layout: 2 Columns', category: 'View' }, () => store.setLayout('2col'))
reg({ command: 'set_layout_3col', title: 'Layout: 3 Columns', category: 'View' }, () => store.setLayout('3col'))
reg({ command: 'set_layout_2row', title: 'Layout: 2 Rows', category: 'View' }, () => store.setLayout('2row'))
reg({ command: 'focus_left_pane', title: 'Focus Left Pane', category: 'View' }, () => {
  const groups = store.getState().groups
  const idx = groups.findIndex((g) => g.id === store.getState().activeGroupId)
  if (idx > 0) store.setActiveGroup(groups[idx - 1].id)
})
reg({ command: 'focus_right_pane', title: 'Focus Right Pane', category: 'View' }, () => {
  const groups = store.getState().groups
  const idx = groups.findIndex((g) => g.id === store.getState().activeGroupId)
  if (idx >= 0 && idx < groups.length - 1) store.setActiveGroup(groups[idx + 1].id)
})
reg({ command: 'focus_prev_pane', title: 'Focus Previous Pane', category: 'View' }, () => {
  const groups = store.getState().groups
  const idx = groups.findIndex((g) => g.id === store.getState().activeGroupId)
  store.setActiveGroup(groups[(idx - 1 + groups.length) % groups.length].id)
})
reg({ command: 'focus_next_pane', title: 'Focus Next Pane', category: 'View' }, () => {
  const groups = store.getState().groups
  const idx = groups.findIndex((g) => g.id === store.getState().activeGroupId)
  store.setActiveGroup(groups[(idx + 1) % groups.length].id)
})
reg({ command: 'focus_group_0', title: 'Focus Pane 1', category: 'View' }, () => {
  const g0 = store.getState().groups[0]
  if (g0) store.setActiveGroup(g0.id)
})
reg({ command: 'focus_group_1', title: 'Focus Pane 2', category: 'View' }, () => {
  const g1 = store.getState().groups[1]
  if (g1) store.setActiveGroup(g1.id)
})

// ---------------------------------------------------------------------------
// 设置 / 首选项
// ---------------------------------------------------------------------------
reg({ command: 'open_user_settings', title: 'Preferences: Settings', category: 'Preferences' }, async () => {
  const p = await api.userSettingsPath()
  await openFile(p)
})
reg({ command: 'open_user_keymap', title: 'Preferences: Key Bindings', category: 'Preferences' }, async () => {
  const p = await api.userKeymapPath()
  await openFile(p)
})
reg({ command: 'open_project_settings', title: 'Project: Edit Settings', category: 'Project' }, async () => {
  // 项目设置写入 .sublime-project 的 settings 段；此处打开项目文件
  const projPath = store.getState().projectData?.__projectPath
  if (projPath) await openFile(projPath)
})
reg({ command: 'open_syntax_settings', title: 'Preferences: Syntax Specific', category: 'Preferences' }, async () => {
  const path = getFocusedPath()
  if (path) {
    const ext = path.includes('.') ? path.split('.').pop() : 'txt'
    // 打开语言特异设置（虚拟）
    store.newUntitled()
  }
})
reg({ command: 'reload_settings', title: 'Preferences: Reload Settings', category: 'Preferences' }, async () => {
  const user = await api.settingsGet()
  store.setUserSettings(user)
  const themeBase = store.getState().themeBase
  document.documentElement.dataset.theme = themeBase
})

reg({ command: 'show_color_scheme_picker', title: 'Preferences: Color Scheme…', category: 'Preferences' }, () => {
  store.openPalette('color_scheme')
})
reg({ command: 'show_theme_picker', title: 'Preferences: Theme…', category: 'Preferences' }, () => {
  store.openPalette('color_scheme')
})

function applySetting(patch: Record<string, unknown>): void {
  store.setSettings(patch)
  void api.settingsSet(store.getState().userSettings)
}

reg({ command: 'toggle_word_wrap', title: 'View: Toggle Word Wrap', category: 'View' }, () =>
  applySetting({ word_wrap: !store.getState().settings.word_wrap })
)
reg({ command: 'toggle_line_numbers', title: 'View: Toggle Line Numbers', category: 'View' }, () =>
  applySetting({ render_line_numbers: store.getState().settings.render_line_numbers === false })
)
reg({ command: 'toggle_show_whitespace', title: 'View: Toggle Whitespace', category: 'View' }, () =>
  applySetting({
    draw_white_space: store.getState().settings.draw_white_space === 'all' ? 'none' : 'all'
  })
)
reg({ command: 'toggle_highlight_line', title: 'View: Toggle Highlight Line', category: 'View' }, () =>
  applySetting({ highlight_line: !store.getState().settings.highlight_line })
)
reg({ command: 'increase_font_size', title: 'Preferences: Increase Font Size', category: 'Preferences' }, () =>
  applySetting({ font_size: Math.min(32, (Number(store.getState().settings.font_size) || 13) + 1) })
)
reg({ command: 'decrease_font_size', title: 'Preferences: Decrease Font Size', category: 'Preferences' }, () =>
  applySetting({ font_size: Math.max(8, (Number(store.getState().settings.font_size) || 13) - 1) })
)
reg({ command: 'toggle_auto_indent', title: 'Preferences: Toggle Auto Indent', category: 'Preferences' }, () =>
  applySetting({ auto_indent: store.getState().settings.auto_indent !== false ? false : true })
)

reg({ command: 'insert_snippet', title: 'Snippet…', category: 'Tools' }, () => {
  store.openPalette('snippet')
})

reg({ command: 'toggle_vim_mode', title: 'Vim Mode', category: 'Tools' }, () => {
  toggleVim()
})

// ---- 自动更新 ----
api.on(IPC.UPDATE_STATE, (payload) => {
  const p = payload as { state: string; version?: string; message?: string }
  if (p.state === 'available') store.notify(`发现新版本 ${p.version ?? ''}，正在下载…`, 6000)
  else if (p.state === 'downloaded') store.notify(`新版本 ${p.version ?? ''} 已就绪，退出时自动安装`, 6000)
  else if (p.state === 'none') store.notify('已是最新版本', 3000)
  else if (p.state === 'error') store.notify(`更新检查失败：${p.message ?? '未知错误'}`, 5000)
})
reg({ command: 'check_for_updates', title: 'Check for Updates…', category: 'Help' }, () => {
  store.notify('正在检查更新…')
  void api.checkForUpdates()
})
reg({ command: 'install_update', title: 'Install Update and Restart', category: 'Help' }, () => {
  void api.quitAndInstallUpdates()
})

// ---- 包管理 ----
reg({ command: 'install_package', title: 'Install Package…', category: 'Tools' }, async () => {
  const url = window.prompt(
    '输入 channel 地址、git 仓库地址或 zip 下载地址：',
    'https://packagecontrol.io/channel_v3.json'
  )
  if (!url) return
  store.notify('正在获取包列表…', 15000)
  try {
    const pkgs = await api.fetchChannel(url)
    if (pkgs.length > 0) {
      const text = pkgs.map((p, i) => `${i + 1}. ${p.name}${p.description ? ' — ' + p.description : ''}`).join('\n')
      const choice = window.prompt(`选择要安装的包（输入序号，0 取消）：\n\n${text}`, '0')
      if (!choice) return
      const idx = parseInt(choice, 10) - 1
      const p = pkgs[idx]
      if (!p) return
      store.notify(`正在安装 ${p.name}…`, 15000)
      await api.installPackage(p.name, p.source)
      store.notify(`已安装 ${p.name}，重启后生效`)
    } else {
      const name = url.split('/').pop()?.replace(/\.git$|\.zip$|\.tar\.gz$/, '') || 'package'
      store.notify(`正在安装 ${name}…`, 15000)
      await api.installPackage(name, url)
      store.notify(`已安装 ${name}，重启后生效`)
    }
  } catch (e) {
    store.notify(`安装失败：${String((e as Error).message)}`, 6000)
  }
})
reg({ command: 'remove_package', title: 'Remove Package…', category: 'Tools' }, async () => {
  const pkgs = await api.listPackages()
  if (pkgs.length === 0) {
    store.notify('没有已安装的包')
    return
  }
  const choice = window.prompt(`选择要移除的包（输入序号，0 取消）：\n\n${pkgs.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}`, '0')
  if (!choice) return
  const idx = parseInt(choice, 10) - 1
  const p = pkgs[idx]
  if (!p || p.name === 'User') return
  await api.removePackage(p.name)
  store.notify(`已移除 ${p.name}`)
})

// ---- 拼写检查 ----
reg({ command: 'toggle_spell_check', title: 'Toggle Spell Check', category: 'Preferences' }, () => {
  const enabled = store.getState().settings.spell_check === true
  applySetting({ spell_check: !enabled })
  void api.setSpellCheckEnabled(!enabled)
  store.notify(enabled ? '拼写检查已关闭' : '拼写检查已开启', 3000)
})

// ---- 宏 ----
let macroRecording = false
let macroList: MacroEntry[] = []
setMacroRecordSink((e) => {
  if (macroRecording) macroList.push(e)
})

reg({ command: 'record_macro', title: 'Toggle Record Macro', category: 'Tools' }, () => {
  macroRecording = !macroRecording
  if (macroRecording) macroList = []
  store.setMacroRecording(macroRecording)
})
reg({ command: 'run_macro', title: 'Run Macro', category: 'Tools' }, () => {
  if (macroRecording) {
    macroRecording = false
    store.setMacroRecording(false)
  }
  for (const e of macroList) runCommand(e.command, e.args)
})
reg({ command: 'save_macro', title: 'Save Macro…', category: 'Tools' }, async () => {
  const res = await api.saveDialog('macro.sublime-macro')
  if (res.canceled || !res.path) return
  await api.writeFile(res.path, JSON.stringify(macroList, null, 2) + '\n')
})

// ---------------------------------------------------------------------------
// 构建
// ---------------------------------------------------------------------------
reg({ command: 'run_build', title: 'Build', category: 'Tools' }, async () => {
  await runActiveBuild()
})
reg({ command: 'cancel_build', title: 'Cancel Build', category: 'Tools' }, async () => {
  await api.cancelBuild()
  store.setBuildPanel({ running: false })
})
reg({ command: 'show_build_results', title: 'Show Build Results', category: 'Tools' }, () => {
  store.setBuildPanel({ open: true })
})
reg({ command: 'goto_build_result', title: 'Goto Build Result', category: 'Tools' }, async () => {
  const args = (getCommandArgs('goto_build_result') ?? {}) as { file?: string; line?: number }
  if (args.file) {
    await openFile(args.file)
    if (args.line) setTimeout(() => revealLineInEditor(args.line!), 80)
  }
})

// ---------------------------------------------------------------------------
// 其他
// ---------------------------------------------------------------------------
reg({ command: 'reveal_in_sidebar', title: 'Reveal in Side Bar', category: 'File' }, () => {
  const p = getFocusedPath()
  if (p && !p.startsWith('untitled://')) void api.revealInSidebar(p)
})
reg({ command: 'copy_file_path', title: 'Copy File Path', category: 'File' }, () => {
  const p = getFocusedPath()
  if (p) void api.copyPath(p)
})
reg({ command: 'show_in_folder', title: 'Show in Finder/Explorer', category: 'File' }, () => {
  const p = getFocusedPath()
  if (p && !p.startsWith('untitled://')) void api.showItemInFolder(p)
})
reg({ command: 'refresh_project', title: 'Refresh Folders', category: 'Project' }, async () => {
  await refreshGitState()
})

// ---- 构建系统查找 ----
const BUILTIN_BUILD_SYSTEMS: BuildSystem[] = [
  {
    name: 'Python',
    shell_cmd: 'python3 "$file"',
    file_regex: '^\\s*File "([^"]+)", line ([0-9]+)',
    selector: 'source.python'
  },
  {
    name: 'Node.js (Run)',
    shell_cmd: 'node "$file"',
    selector: 'source.js'
  },
  {
    name: 'Make',
    cmd: ['make'],
    selector: 'source.makefile'
  }
]

async function collectBuildSystems(): Promise<{ specs: BuildSystem[]; defaultIndex: number }> {
  const proj = store.getState().projectData
  const specs: BuildSystem[] = [...(proj?.build_systems ?? [])]
  let defaultIndex = 0
  if (specs.length === 0) {
    // 用内建兜底（后续版本扫描 *.sublime-build）
    specs.push(...BUILTIN_BUILD_SYSTEMS)
  }
  return { specs, defaultIndex }
}

async function runActiveBuild(): Promise<void> {
  const { specs, defaultIndex } = await collectBuildSystems()
  if (specs.length === 0) {
    store.setBuildPanel({ open: true, output: 'No build system available.', matches: [] })
    return
  }
  const spec = specs[defaultIndex]
  const file = getFocusedPath()
  const projectPath = store.getState().folderPaths[0]
  store.setBuildPanel({ open: true, output: '', matches: [], running: true })

  const off = api.on('build:output', (chunk: unknown) => {
    store.setBuildPanel({ output: store.getState().ui.buildPanel.output + String(chunk) })
  })
  const off2 = api.on('build:finished', (result: unknown) => {
    const r = result as { exitCode: number | null; output: string; matches: unknown[]; canceled: boolean }
    store.setBuildPanel({ output: r.output, matches: (r.matches as never[]) ?? [], running: false })
    off()
    off2()
  })

  await api.runBuild(spec, { file: file && !file.startsWith('untitled://') ? file : undefined, projectPath })
}

// 供 build result 传参的轻量实现
let lastArgs: Record<string, unknown> = {}
function getCommandArgs(_cmd: string): Record<string, unknown> {
  return lastArgs
}
export function setCommandArgsForNext(args: Record<string, unknown>): void {
  lastArgs = args
}