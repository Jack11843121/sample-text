/**
 * 跨进程共享类型定义（main / preload / renderer 共同引用）。
 * 这是整个应用的契约层：任何跨 IPC 的数据结构都定义在这里。
 */

export type Platform = 'darwin' | 'win32' | 'linux'

export type Eol = 'LF' | 'CRLF' | 'CR'

export type Encoding = 'utf8' | 'utf8bom' | 'utf16le'

export type NodeKind = 'file' | 'directory' | 'symlink-file' | 'symlink-directory'

export type GitStatusChar = 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?' | '!' | ' '

export interface TreeNode {
  name: string
  path: string
  kind: NodeKind
  /** 是否目录 */
  isDirectory: boolean
  /** 符号链接的目标（若是 symlink） */
  symlinkTarget?: string
  /** 目录的子节点（仅目录展开时加载） */
  children?: TreeNode[]
  /** 是否被 git 忽略 */
  ignored?: boolean
  /** git 状态字符（用于侧边栏徽章） */
  gitStatus?: GitStatusChar
}

export interface ReadFileResult {
  path: string
  content: string
  encoding: Encoding
  eol: Eol
  mtime: number
  /** 文件变更的外部标记（用于外部修改检测） */
  size: number
}

export interface WriteFileOptions {
  encoding?: Encoding
  eol?: Eol
}

export interface StatInfo {
  path: string
  exists: boolean
  isDirectory: boolean
  isFile: boolean
  size: number
  mtime: number
}

export interface OpenDialogResult {
  canceled: boolean
  paths: string[]
}

export interface SaveDialogResult {
  canceled: boolean
  path?: string
}

export interface GitState {
  isRepo: boolean
  branch?: string
  /** 工作区改动文件映射：路径 -> 状态字符 */
  status: Record<string, GitStatusChar>
  /** 改动统计 */
  staged: number
  unstaged: number
  untracked: number
}

export interface LineDiff {
  added: number[]
  modified: number[]
  deleted: number[]
}

export interface BuildResultMatch {
  file?: string
  line?: number
  column?: number
  message: string
}

export interface SearchHit {
  path: string
  line: number
  column: number
  text: string
}

export interface SearchOptions {
  query: string
  caseSensitive?: boolean
  regex?: boolean
  wholeWord?: boolean
  include?: string
}

export interface BuildResult {
  exitCode: number | null
  output: string
  /** 按 file_regex 解析出的导航结果 */
  matches: BuildResultMatch[]
  /** 是否被用户取消 */
  canceled: boolean
}

/** 项目（.sublime-project）结构 */
export interface ProjectData {
  /** 绝对路径的 folders */
  folders: { path: string; name?: string; follow_symlinks?: boolean }[]
  settings?: Record<string, unknown>
  build_systems?: BuildSystem[]
  /** 项目文件自身路径（.sublime-project） */
  __projectPath?: string
}

export interface BuildSystem {
  name: string
  cmd?: string | string[]
  shell_cmd?: string
  working_dir?: string
  file_regex?: string
  line_regex?: string
  selector?: string
  variants?: BuildSystem[]
  windows?: Partial<BuildSystem>
  osx?: Partial<BuildSystem>
  linux?: Partial<BuildSystem>
  env?: Record<string, string>
  quiet?: boolean
}

export type SettingsDict = Record<string, unknown>

/** 命令：UI 层与编辑器层的统一调度单元 */
export interface CommandSpec {
  command: string
  args?: Record<string, unknown>
}

/** 键位解析结果 */
export interface KeyChord {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export interface KeyBindingRule {
  keys: string[]
  command: string
  args?: Record<string, unknown>
  context?: ContextRule[]
}

export interface ContextRule {
  key: string
  operator?:
    | 'equal'
    | 'not_equal'
    | 'regex_contains'
    | 'not_regex_contains'
    | 'regex_match'
    | 'not_regex_match'
  operand?: string | number | boolean
  match_all?: boolean
}

export interface PackagedResource {
  path: string
  type: string
  packageName: string
}

/** 远程包（channel 或 git URL）元数据 */
export interface RemotePackage {
  name: string
  description?: string
  version?: string
  source: string // git 或 zip URL
  labels?: string[]
}

/** 插件/包元数据 */
export interface PackageMeta {
  name: string
  description?: string
  version?: string
  author?: string
  homepage?: string
  /** 包根目录（loose）或 .sublime-package 路径 */
  location: string
  /** 来源类型 */
  source: 'loose' | 'sublime-package' | 'channel'
  /** 是否内建 */
  builtin?: boolean
  /** 资源合并顺序（default < 字母序 < user） */
  order: number
}

/** 平台上可用的 API 形状（preload 暴露到 window.sampleText） */
export interface SampleTextApi {
  platform: Platform
  version: string

  // 文件系统
  openDialog(): Promise<OpenDialogResult>
  openFolderDialog(): Promise<OpenDialogResult>
  saveDialog(defaultName?: string): Promise<SaveDialogResult>
  readFile(path: string): Promise<ReadFileResult>
  writeFile(path: string, content: string, opts?: WriteFileOptions): Promise<void>
  stat(path: string): Promise<StatInfo>
  readDir(path: string): Promise<TreeNode[]>
  tree(path: string): Promise<TreeNode>
  listFiles(root: string): Promise<string[]>
  exists(path: string): Promise<boolean>

  // 项目
  loadProject(projectFilePath?: string): Promise<ProjectData | null>
  resolveProject(folderPath: string): Promise<ProjectData | null>
  watchProjectPaths(paths: string[]): Promise<void>

  // 包系统
  scanPackageResources(kinds: string[]): Promise<PackagedResource[]>
  listPackages(): Promise<PackageMeta[]>
  fetchChannel(url: string): Promise<RemotePackage[]>
  installPackage(name: string, source: string): Promise<void>
  removePackage(name: string): Promise<void>

  // 自动更新
  checkForUpdates(): Promise<void>
  quitAndInstallUpdates(): Promise<void>

  // 构建
  runBuild(spec: BuildSystem, scope: { file?: string; projectPath?: string }): Promise<BuildResult>
  cancelBuild(): Promise<void>

  // git
  gitStatus(folderPath: string): Promise<GitState>
  gitDiffLines(folderPath: string, file: string): Promise<LineDiff>

  // 全局搜索
  searchInFiles(folders: string[], opts: SearchOptions): Promise<SearchHit[]>

  // 设置持久化
  settingsGet(): Promise<SettingsDict>
  settingsSet(patch: SettingsDict): Promise<void>
  userSettingsPath(): Promise<string>
  userKeymapPath(): Promise<string>
  setSpellCheckEnabled(enabled: boolean): Promise<void>

  // 应用
  appSetTitle(title: string): Promise<void>
  appSetDocumentEdited(edited: boolean): Promise<void>
  openInNewWindow(path?: string): Promise<void>
  showItemInFolder(path: string): Promise<void>
  revealInSidebar(path: string): Promise<void>
  copyPath(path: string): Promise<void>

  // 事件订阅（安全封装 ipcRenderer）
  on(channel: string, listener: (...args: unknown[]) => void): () => void
  off(channel: string, listener: (...args: unknown[]) => void): void
}

/** 主进程推送给渲染层的事件通道 */
export const IPC = {
  /** 文件系统变化 */
  FS_CHANGED: 'fs:changed',
  /** 构建输出流 */
  BUILD_OUTPUT: 'build:output',
  BUILD_FINISHED: 'build:finished',
  /** git 状态更新 */
  GIT_CHANGED: 'git:changed',
  /** 外部请求打开文件（CLI / macOS open-file） */
  APP_OPEN_FILE: 'app:open-file',
  /** 设置被外部修改 */
  SETTINGS_CHANGED: 'settings:changed',
  /** 菜单命令转发 */
  MENU_COMMAND: 'menu:command',
  /** 主题系统颜色变化 */
  NATIVE_THEME_CHANGED: 'native-theme-changed',
  /** 自动更新状态 */
  UPDATE_STATE: 'update:state'
} as const

export type IpcResponse<T> = { ok: true; data: T } | { ok: false; error: string }