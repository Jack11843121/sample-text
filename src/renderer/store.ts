import { useSyncExternalStore } from 'react'
import type {
  BuildResultMatch,
  Eol,
  Encoding,
  GitState,
  ProjectData,
  SettingsDict
} from '@shared/types'
import { mergeSettings } from '@shared/settings'

export type LayoutSpec = '1col' | '2col' | '3col' | '2row'

export interface DocState {
  path: string
  value: string
  encoding: Encoding
  eol: Eol
  mtime: number
  dirty: boolean
  untitled: boolean
  language: string
  /** 打开时间，用于 MRU 标签排序 */
  openedAt: number
}

export interface GroupState {
  id: string
  activePath: string | null
}

export type PaletteMode =
  | 'command'
  | 'file'
  | 'symbol'
  | 'symbol_project'
  | 'line'
  | 'snippet'
  | 'color_scheme'

export interface PaletteState {
  open: boolean
  mode: PaletteMode
  /** project 模式下传入 Goto Symbol in Project 的特殊前缀 */
  prefix?: string
}

export interface BuildPanelState {
  open: boolean
  output: string
  matches: BuildResultMatch[]
  running: boolean
}

export interface UiState {
  sidebarVisible: boolean
  showTabs: boolean
  showMinimap: boolean
  showStatusBar: boolean
  distractionFree: boolean
  fullscreen: boolean
  palette: PaletteState
  buildPanel: BuildPanelState
  findInFilesOpen: boolean
  recentFiles: string[]
  closedFiles: string[]
  macroRecording: boolean
  statusMessage: string | null
  previewScrollTo?: { path: string; line: number }
}

export interface AppState {
  layout: LayoutSpec
  groups: GroupState[]
  activeGroupId: string
  documents: Map<string, DocState>
  /** 标签顺序（MRU） */
  tabOrder: string[]
  activePath: string | null
  projectData: ProjectData | null
  folderPaths: string[]
  /** 合并后的最终设置（defaults + user + project） */
  settings: SettingsDict
  userSettings: SettingsDict
  defaults: SettingsDict
  gitState: GitState | null
  themeBase: 'dark' | 'light'
  activeColorScheme: string
  ui: UiState
}

type Listener = () => void

export const DEFAULT_SETTINGS: SettingsDict = {
  font_size: 13,
  font_face: 'monospace',
  tab_size: 4,
  translate_tabs_to_spaces: true,
  detect_indentation: true,
  auto_indent: true,
  highlight_line: false,
  highlight_modified_tabs: true,
  word_wrap: false,
  draw_white_space: 'none',
  draw_minimap_border: true,
  minimap_enabled: true,
  render_line_numbers: true,
  fold_buttons: true,
  ruler: [],
  color_scheme_light: 'sample-text Light',
  color_scheme_dark: 'sample-text Dark',
  theme: 'sample-text.sublime-theme',
  show_tabs: true,
  show_status_bar: true,
  ensure_newline_at_eof_on_save: true,
  trim_trailing_white_space_on_save: false,
  index_files: true,
  index_exclude_patterns: ['node_modules', '.git'],
  ignored_packages: [],
  default_line_ending: 'system',
  highlight_updated_tags: false,
  show_definitions: true,
  scroll_past_end: true,
  spell_check: false
}

let untitledCounter = 0

export class AppStore {
  private state: AppState
  private listeners = new Set<Listener>()

  constructor() {
    const groups: GroupState[] = [{ id: 'group-0', activePath: null }]
    this.state = {
      layout: '1col',
      groups,
      activeGroupId: 'group-0',
      documents: new Map(),
      tabOrder: [],
      activePath: null,
      projectData: null,
      folderPaths: [],
      settings: { ...DEFAULT_SETTINGS },
      userSettings: {},
      defaults: { ...DEFAULT_SETTINGS },
      gitState: null,
      themeBase: 'dark',
      activeColorScheme: 'sample-text Dark',
      ui: {
        sidebarVisible: true,
        showTabs: true,
        showMinimap: true,
        showStatusBar: true,
        distractionFree: false,
        fullscreen: false,
        palette: { open: false, mode: 'command' },
        buildPanel: { open: false, output: '', matches: [], running: false },
        findInFilesOpen: false,
        recentFiles: [],
        closedFiles: [],
        macroRecording: false,
        statusMessage: null
      }
    }
  }

  getState = (): AppState => this.state

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    for (const l of this.listeners) l()
  }

  private patch<P extends Partial<AppState>>(part: P): void {
    this.state = { ...this.state, ...part }
    this.emit()
  }

  // ---- 设置 ----
  setDefaults(defaults: SettingsDict): void {
    this.state.defaults = { ...DEFAULT_SETTINGS, ...defaults }
    this.recomputeSettings()
  }

  setUserSettings(user: SettingsDict): void {
    this.state.userSettings = user
    this.recomputeSettings()
  }

  private recomputeSettings(): void {
    this.state.settings = mergeSettings(
      this.state.defaults,
      this.state.userSettings,
      this.state.projectData?.settings
    )
    this.emit()
  }

  setSettings(patch: SettingsDict): void {
    this.state.userSettings = mergeSettings(this.state.userSettings, patch)
    this.recomputeSettings()
  }

  setThemeBase(base: 'dark' | 'light'): void {
    if (this.state.themeBase !== base) {
      this.state.themeBase = base
      this.emit()
    }
  }

  setActiveColorScheme(name: string): void {
    this.state.activeColorScheme = name
    this.emit()
  }

  // ---- 文档 ----
  setDocument(path: string, doc: DocState): void {
    this.state.documents = new Map(this.state.documents).set(path, doc)
    if (!this.state.tabOrder.includes(path)) {
      this.state.tabOrder = [...this.state.tabOrder, path]
    }
    this.setActivePath(path)
    this.emit()
  }

  touchDocument(path: string): void {
    const doc = this.state.documents.get(path)
    if (!doc) return
    this.state.documents = new Map(this.state.documents).set(path, { ...doc, openedAt: Date.now() })
    this.emit()
  }

  replaceDocument(path: string, doc: DocState): void {
    this.state.documents = new Map(this.state.documents).set(path, doc)
    this.emit()
  }

  setValue(path: string, value: string, dirty = true): void {
    const doc = this.state.documents.get(path)
    if (!doc) return
    // 静默更新值（高频），不触发重渲染
    this.state.documents = new Map(this.state.documents).set(path, { ...doc, value })
    if (dirty) this.markDirty(path, dirty)
  }

  markDirty(path: string, dirty = true): void {
    const doc = this.state.documents.get(path)
    if (!doc || doc.dirty === dirty) return
    this.state.documents = new Map(this.state.documents).set(path, { ...doc, dirty })
    this.emit()
  }

  markSaved(path: string, info: { value: string; encoding: Encoding; eol: Eol; mtime: number }): void {
    const doc = this.state.documents.get(path)
    if (!doc) return
    this.state.documents = new Map(this.state.documents).set(path, {
      ...doc,
      value: info.value,
      encoding: info.encoding,
      eol: info.eol,
      mtime: info.mtime,
      dirty: false
    })
    this.emit()
  }

  closeDocument(path: string): void {
    const docs = new Map(this.state.documents)
    docs.delete(path)
    this.state.documents = docs
    this.state.tabOrder = this.state.tabOrder.filter((p) => p !== path)
    // 更新各组引用
    const groups = this.state.groups.map((g) => ({
      ...g,
      activePath: g.activePath === path ? this.nextAvailablePath(path, g) : g.activePath
    }))
    this.state.groups = groups
    if (this.state.activePath === path) {
      this.state.activePath = groups.find((g) => g.id === this.state.activeGroupId)?.activePath ?? null
    }
    this.emit()
  }

  private nextAvailablePath(closed: string, group: GroupState): string | null {
    const candidates = this.state.tabOrder.filter((p) => p !== closed)
    if (candidates.length === 0) return null
    return candidates[candidates.length - 1]
  }

  newUntitled(): string {
    untitledCounter += 1
    const path = `untitled://Untitled-${untitledCounter}`
    const doc: DocState = {
      path,
      value: '',
      encoding: 'utf8',
      eol: 'LF',
      mtime: Date.now(),
      dirty: false,
      untitled: true,
      language: 'plaintext',
      openedAt: Date.now()
    }
    this.setDocument(path, doc)
    return path
  }

  // ---- 活动状态 ----
  setActivePath(path: string | null): void {
    this.state.activePath = path
    if (path) {
      const g = this.state.groups.find((x) => x.id === this.state.activeGroupId)
      if (g) {
        this.state.groups = this.state.groups.map((x) =>
          x.id === g.id ? { ...x, activePath: path } : x
        )
      }
      const doc = this.state.documents.get(path)
      if (doc) this.touchDocument(path)
    }
    this.emit()
  }

  setActiveGroup(id: string): void {
    this.state.activeGroupId = id
    const g = this.state.groups.find((x) => x.id === id)
    if (g) this.state.activePath = g.activePath
    this.emit()
  }

  setLayout(layout: LayoutSpec): void {
    const count = layout === '3col' ? 3 : layout === '2col' || layout === '2row' ? 2 : 1
    const current = this.state.groups
    const groups: GroupState[] = []
    for (let i = 0; i < count; i++) {
      groups.push(current[i] ?? { id: `group-${i}`, activePath: current[0]?.activePath ?? null })
    }
    this.state.layout = layout
    this.state.groups = groups
    if (!groups.find((g) => g.id === this.state.activeGroupId)) {
      this.state.activeGroupId = groups[0].id
    }
    this.emit()
  }

  setGroupActivePath(groupId: string, path: string | null): void {
    this.state.groups = this.state.groups.map((g) => (g.id === groupId ? { ...g, activePath: path } : g))
    if (this.state.activeGroupId === groupId) this.state.activePath = path
    this.emit()
  }

  closeGroup(groupId: string): void {
    const groups = this.state.groups.filter((g) => g.id !== groupId)
    if (groups.length === 0) return
    this.state.groups = groups
    if (this.state.activeGroupId === groupId) this.state.activeGroupId = groups[0].id
    const layout: LayoutSpec = groups.length === 1 ? '1col' : '2col'
    this.state.layout = layout
    this.emit()
  }

  // ---- 项目 ----
  setProject(project: ProjectData | null): void {
    this.state.projectData = project
    this.state.folderPaths = project?.folders.map((f) => f.path) ?? []
    if (project?.settings) {
      this.recomputeSettings()
    }
    this.emit()
  }

  setGitState(state: GitState | null): void {
    this.state.gitState = state
    this.emit()
  }

  // ---- UI ----
  toggleSidebar(): void {
    this.state.ui = { ...this.state.ui, sidebarVisible: !this.state.ui.sidebarVisible }
    this.emit()
  }
  setSidebarVisible(v: boolean): void {
    this.state.ui = { ...this.state.ui, sidebarVisible: v }
    this.emit()
  }
  toggleMinimap(): void {
    this.state.ui = { ...this.state.ui, showMinimap: !this.state.ui.showMinimap }
    this.emit()
  }
  toggleTabs(): void {
    this.state.ui = { ...this.state.ui, showTabs: !this.state.ui.showTabs }
    this.emit()
  }
  toggleStatusBar(): void {
    this.state.ui = { ...this.state.ui, showStatusBar: !this.state.ui.showStatusBar }
    this.emit()
  }
  toggleDistractionFree(): void {
    this.state.ui = { ...this.state.ui, distractionFree: !this.state.ui.distractionFree }
    this.emit()
  }
  openPalette(mode: PaletteMode, prefix?: string): void {
    this.state.ui = { ...this.state.ui, palette: { open: true, mode, prefix } }
    this.emit()
  }
  closePalette(): void {
    this.state.ui = { ...this.state.ui, palette: { open: false, mode: 'command', prefix: undefined } }
    this.emit()
  }
  setBuildPanel(panel: Partial<BuildPanelState>): void {
    this.state.ui = {
      ...this.state.ui,
      buildPanel: { ...this.state.ui.buildPanel, ...panel }
    }
    this.emit()
  }
  setFindInFilesOpen(v: boolean): void {
    this.state.ui = { ...this.state.ui, findInFilesOpen: v }
    this.emit()
  }
  addRecentFile(path: string): void {
    const list = [path, ...this.state.ui.recentFiles.filter((p) => p !== path)].slice(0, 20)
    this.state.ui = { ...this.state.ui, recentFiles: list }
    this.emit()
  }
  pushClosedFile(path: string): void {
    const list = [path, ...this.state.ui.closedFiles.filter((p) => p !== path)].slice(0, 50)
    this.state.ui = { ...this.state.ui, closedFiles: list }
    this.emit()
  }
  popClosedFile(): string | null {
    const list = [...this.state.ui.closedFiles]
    const p = list.shift() ?? null
    this.state.ui = { ...this.state.ui, closedFiles: list }
    this.emit()
    return p
  }
  setMacroRecording(on: boolean): void {
    this.state.ui = { ...this.state.ui, macroRecording: on }
    this.emit()
  }
  notify(message: string, timeoutMs = 3000): void {
    this.state.ui = { ...this.state.ui, statusMessage: message }
    this.emit()
    if (this._notifyTimer) clearTimeout(this._notifyTimer)
    this._notifyTimer = setTimeout(() => {
      this._notifyTimer = undefined
      this.state.ui = { ...this.state.ui, statusMessage: null }
      this.emit()
    }, timeoutMs)
  }
  private _notifyTimer?: ReturnType<typeof setTimeout>
  setPreviewScrollTo(target?: { path: string; line: number }): void {
    this.state.ui = { ...this.state.ui, previewScrollTo: target }
    this.emit()
  }
}

export const store = new AppStore()

/** React 绑定：订阅整个 store（粒度够用） */
export function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.getState)
}