import { contextBridge, ipcRenderer } from 'electron'
import type {
  BuildSystem,
  Encoding,
  Eol,
  GitState,
  LineDiff,
  SampleTextApi,
  OpenDialogResult,
  PackageMeta,
  PackagedResource,
  Platform,
  ProjectData,
  ReadFileResult,
  RemotePackage,
  SaveDialogResult,
  SearchHit,
  SearchOptions,
  SettingsDict,
  StatInfo,
  TreeNode,
  WorkspaceState
} from '@shared/types'

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

const api: SampleTextApi = {
  platform: process.platform as Platform,
  version: '0.1.0',

  openDialog: () => invoke<OpenDialogResult>('dialog.openFile'),
  openFolderDialog: () => invoke<OpenDialogResult>('dialog.openFolder'),
  saveDialog: (defaultName?: string) => invoke<SaveDialogResult>('dialog.save', defaultName),

  readFile: (path: string) => invoke<ReadFileResult>('fs.readFile', path),
  writeFile: (path: string, content: string, opts?: { encoding?: Encoding; eol?: Eol }) =>
    invoke<void>('fs.writeFile', path, content, opts),
  stat: (path: string) => invoke<StatInfo>('fs.stat', path),
  readDir: (path: string) => invoke<TreeNode[]>('fs.readDir', path),
  tree: (path: string) => invoke<TreeNode>('fs.tree', path),
  listFiles: (root: string) => invoke<string[]>('fs.listFiles', root),
  exists: (path: string) => invoke<boolean>('fs.exists', path),

  loadProject: (projectFilePath?: string) => invoke<ProjectData | null>('project.load', projectFilePath),
  resolveProject: (folderPath: string) => invoke<ProjectData | null>('project.resolve', folderPath),

  runBuild: (spec: BuildSystem, scope) => invoke('build.run', spec, scope),
  cancelBuild: () => invoke<void>('build.cancel'),

  gitStatus: (folderPath: string) => invoke<GitState>('git.status', folderPath),
  gitDiffLines: (folderPath: string, file: string) => invoke<LineDiff>('git.diffLines', folderPath, file),
  searchInFiles: (folders: string[], opts: SearchOptions) => invoke<SearchHit[]>('search.findInFiles', folders, opts),

  settingsGet: () => invoke<SettingsDict>('settings.get'),
  settingsSet: (patch: SettingsDict) => invoke<void>('settings.set', patch),
  userSettingsPath: () => invoke<string>('settings.userPath'),
  userKeymapPath: () => invoke<string>('settings.keymapPath'),
  setSpellCheckEnabled: (enabled: boolean) => invoke<void>('spellcheck.set', enabled),

  loadWorkspace: () => invoke<WorkspaceState>('workspace.load'),
  saveWorkspace: (ws: WorkspaceState) => invoke<void>('workspace.save', ws),
  watchProjectPaths: (paths: string[]) => invoke<void>('project.watch', paths),

  scanPackageResources: (kinds: string[]) => invoke<PackagedResource[]>('packages.scan', kinds),
  listPackages: () => invoke<PackageMeta[]>('packages.list'),
  fetchChannel: (url: string) => invoke<RemotePackage[]>('packages.fetchChannel', url),
  installPackage: (name: string, source: string) => invoke<void>('packages.install', name, source),
  removePackage: (name: string) => invoke<void>('packages.remove', name),

  checkForUpdates: () => invoke<void>('update.check'),
  quitAndInstallUpdates: () => invoke<void>('update.quitAndInstall'),

  appSetTitle: (title: string) => invoke<void>('app.setTitle', title),
  appSetDocumentEdited: (edited: boolean) => invoke<void>('app.documentEdited', edited),
  openInNewWindow: (path?: string) => invoke<void>('app.openInNewWindow', path),
  showItemInFolder: (path: string) => invoke<void>('app.showItemInFolder', path),
  revealInSidebar: (path: string) => invoke<void>('app.revealInSidebar', path),
  copyPath: (path: string) => invoke<void>('app.copyPath', path),

  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const wrapped = (_event: unknown, ...args: unknown[]): void => listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },
  off: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

contextBridge.exposeInMainWorld('sampleText', api)