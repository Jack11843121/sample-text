import { BrowserWindow, dialog, ipcMain, shell, clipboard, Menu } from 'electron'
import {
  readFile,
  writeFile,
  statInfo,
  readDir,
  tree,
  existsOk,
  listFiles,
  deletePath,
  watchPaths,
  type FsChangeEvent
} from './services/filesystem'
import { readUserSettings, writeUserSettings, getUserSettingsPath, getUserKeymapPath } from './services/settings-store'
import { readProject, openFolderAsProject } from './services/project'
import { runBuild, cancelActiveBuild } from './services/build'
import { gitStatus, gitDiffLines } from './services/git'
import { findInFiles } from './services/search'
import { getPackageRoots, scanResources, listPackages, fetchChannel, installPackage, removePackage } from './services/packages'
import { initAutoUpdater, checkForUpdates, quitAndInstall } from './services/updater'
import { readWorkspace, writeWorkspace } from './services/workspace'
import { IPC, type BuildResult, type BuildSystem, type SettingsDict, type GitState, type SearchOptions, type WorkspaceState } from '@shared/types'
import type { FSWatcher } from 'chokidar'

let win: BrowserWindow | null = null
let fsWatcher: FSWatcher | null = null
let watchedPaths: string[] = []
let ipcHandlersRegistered = false

function send(channel: string, ...args: unknown[]): void {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
}

function handle<T>(channel: string, fn: (...args: never[]) => Promise<T> | T): void {
  ipcMain.handle(channel, (_event, ...args) => fn(...(args as never[])))
}

export function registerIpc(window: BrowserWindow): void {
  win = window
  // ipcMain.handle 只能注册一次：macOS 上窗口关闭后再次 activate 会重建窗口，
  // 此处必须跳过重复注册，仅重绑当前窗口引用，否则抛「Attempted to register a second handler」。
  if (ipcHandlersRegistered) return
  ipcHandlersRegistered = true

  initAutoUpdater(send)

  // ---- 文件系统 ----
  handle('fs.readFile', (p: string) => readFile(p))
  handle('fs.writeFile', (p: string, content: string, opts) => writeFile(p, content, opts))
  handle('fs.stat', (p: string) => statInfo(p))
  handle('fs.readDir', (p: string, gitStatusMap) => readDir(p, gitStatusMap))
  handle('fs.tree', (p: string) => tree(p))
  handle('fs.exists', (p: string) => existsOk(p))
  handle('fs.listFiles', (root: string) => listFiles(root))
  handle('fs.delete', (path: string) => deletePath(path))

  // ---- 右键菜单 ----
  handle('menu.context', (entries: { id: string; label: string; danger?: boolean }[]) => {
    return new Promise<string | null>((resolve) => {
      const template = entries.map((e) => ({
        label: e.label,
        click: () => resolve(e.id)
      }))
      const menu = Menu.buildFromTemplate(template)
      menu.popup({ window: win ?? undefined, callback: () => resolve(null) })
    })
  })

  // ---- 对话框（不绑定窗口：macOS 上以独立浮窗形式，最稳） ----
  handle('dialog.openFile', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
    return { canceled: r.canceled, paths: r.filePaths }
  })
  handle('dialog.openFolder', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'multiSelections'] })
    return { canceled: r.canceled, paths: r.filePaths }
  })
  handle('dialog.save', async (defaultName?: string) => {
    const r = await dialog.showSaveDialog({ defaultPath: defaultName })
    return { canceled: r.canceled, path: r.filePath }
  })

  // ---- 项目 ----
  handle('project.load', (p?: string) => (p ? readProject(p) : null))
  handle('project.resolve', (folder: string) => openFolderAsProject(folder))
  handle('project.watch', (paths: string[]) => {
    watchedPaths = paths
    fsWatcher?.close()
    fsWatcher = null
    if (paths.length > 0) {
      fsWatcher = watchPaths(paths, (ev: FsChangeEvent) => {
        send(IPC.FS_CHANGED, ev)
      })
    }
  })

  // ---- 构建 ----
  let buildOutputBuf = ''
  handle('build.run', async (spec: BuildSystem, scope): Promise<BuildResult> => {
    buildOutputBuf = ''
    return await runBuild(spec, scope, (chunk: string) => {
      buildOutputBuf += chunk
      send(IPC.BUILD_OUTPUT, chunk)
    })
  })
  handle('build.cancel', () => {
    cancelActiveBuild()
  })

  // ---- git ----
  handle('git.status', (folder: string): Promise<GitState> => gitStatus(folder))
  handle('git.diffLines', (folder: string, file: string) => gitDiffLines(folder, file))

  // ---- 全局搜索 ----
  handle('search.findInFiles', (folders: string[], opts: SearchOptions) => findInFiles(folders, opts))

  // ---- 包系统 ----
  handle('packages.scan', (kinds: string[]) => scanResources(kinds))
  handle('packages.list', () => listPackages())
  handle('packages.roots', () => getPackageRoots())
  handle('packages.fetchChannel', (url: string) => fetchChannel(url))
  handle('packages.install', (name: string, source: string) => installPackage(name, source))
  handle('packages.remove', (name: string) => removePackage(name))

  // ---- 自动更新 ----
  handle('update.check', () => checkForUpdates())
  handle('update.quitAndInstall', () => quitAndInstall())

  // ---- 设置 ----
  handle('settings.get', (): Promise<SettingsDict> => readUserSettings())
  handle('settings.set', (patch: SettingsDict) => writeUserSettings(patch))
  handle('settings.userPath', () => getUserSettingsPath())
  handle('settings.keymapPath', () => getUserKeymapPath())

  // ---- 工作区（会话） ----
  handle('workspace.load', (): Promise<WorkspaceState> => readWorkspace())
  handle('workspace.save', (ws: WorkspaceState) => writeWorkspace(ws))

  // ---- 拼写检查 ----
  handle('spellcheck.set', (enabled: boolean) => {
    const ses = win?.webContents.session ?? undefined
    if (!ses) return
    ses.setSpellCheckerEnabled(enabled)
    if (enabled) ses.setSpellCheckerLanguages(['en-US'])
  })

  // ---- 应用 ----
  handle('app.setTitle', (t: string) => {
    if (win && !win.isDestroyed()) win.setTitle(t)
  })
  handle('app.documentEdited', (edited: boolean) => {
    if (win && !win.isDestroyed()) win.setDocumentEdited(edited)
  })
  handle('app.openInNewWindow', (p?: string) => {
    openInNewWindow(p)
  })
  handle('app.showItemInFolder', (p: string) => {
    shell.showItemInFolder(p)
  })
  handle('app.copyPath', (p: string) => {
    clipboard.writeText(p)
  })
  handle('app.revealInSidebar', (p: string) => {
    send(IPC.APP_OPEN_FILE, [p])
  })
}

async function openInNewWindow(path?: string): Promise<void> {
  const { createMainWindow } = await import('./index')
  // 简化：通过单实例锁，新窗口由 CLI 语义覆盖；此处聚焦并打开
  if (win && !win.isDestroyed()) {
    if (path) send(IPC.APP_OPEN_FILE, [path])
    win.focus()
    return
  }
  createMainWindow()
}