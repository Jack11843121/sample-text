import { store, type DocState } from './store'
import {
  disposeModel,
  ensureModel,
  getFocusedModel,
  getFocusedPath,
  getModel,
  syncModelContent
} from './editor/session'
import { languageForPath } from './editor/languages'
import { refreshGitGutter } from './features/gitGutter'
import { emitPluginEvent } from './plugins/host'
import type { Eol } from '@shared/types'

const api = window.sampleText

/** 外部修改后重载已打开的文件（不标记脏） */
export async function reloadFile(path: string): Promise<void> {
  const r = await api.readFile(path)
  const doc = store.getState().documents.get(path)
  if (doc) {
    const next: DocState = {
      ...doc,
      value: r.content,
      encoding: r.encoding,
      eol: r.eol,
      mtime: r.mtime,
      language: languageForPath(path)
    }
    store.replaceDocument(path, next)
    syncModelContent(path, r.content, next.language)
  }
}

export async function openFile(path: string): Promise<void> {
  const st = await api.stat(path)
  if (!st.exists) return
  if (st.isDirectory) {
    await openFolder(path)
    return
  }
  const existing = store.getState().documents.get(path)
  if (existing) {
    store.setActivePath(path)
    return
  }
  const r = await api.readFile(path)
  const doc: DocState = {
    path,
    value: r.content,
    encoding: r.encoding,
    eol: r.eol,
    mtime: r.mtime,
    dirty: false,
    untitled: false,
    language: languageForPath(path),
    openedAt: Date.now()
  }
  store.setDocument(path, doc)
  store.addRecentFile(path)
  emitPluginEvent('file.open', { path })
}

export async function openFolder(folderPath: string): Promise<void> {
  const project = await api.resolveProject(folderPath)
  if (project) {
    store.setProject(project)
    await api.watchProjectPaths(project.folders.map((f) => f.path))
    refreshGitState()
  }
}

export async function refreshGitState(): Promise<void> {
  const folders = store.getState().folderPaths
  if (folders.length === 0) {
    store.setGitState(null)
    return
  }
  store.setGitState(await api.gitStatus(folders[0]))
}

export async function loadProjectFile(path: string): Promise<void> {
  const project = await api.loadProject(path)
  if (project) {
    store.setProject(project)
    await api.watchProjectPaths(project.folders.map((f) => f.path))
    refreshGitState()
  }
}

/** 持久化当前打开的会话（文件夹 + 文件列表 + 活动文件） */
export function persistWorkspace(): void {
  const state = store.getState()
  const folders = state.folderPaths
  const openFiles = state.tabOrder.filter((p) => !p.startsWith('untitled://'))
  const activeFile = state.activePath && !state.activePath.startsWith('untitled://') ? state.activePath : null
  void api.saveWorkspace({ folders, openFiles, activeFile })
}

/** 启动时恢复上次打开的会话 */
export async function restoreWorkspace(): Promise<void> {
  const ws = await api.loadWorkspace()
  // 恢复打开的文件夹目录
  const folders = ws.folders ?? []
  for (const f of folders) {
    try {
      await openFolder(f)
    } catch {
      // 目录已不存在则跳过
    }
  }
  // 恢复打开的文件
  for (const p of ws.openFiles) {
    try {
      await openFile(p)
    } catch {
      // 文件已删除/不可读则跳过
    }
  }
  if (ws.activeFile && store.getState().documents.has(ws.activeFile)) {
    store.setActivePath(ws.activeFile)
  }
}

export function normalizeEol(text: string, eol: Eol): string {
  if (eol === 'CRLF') return text.replace(/\r\n|\r|\n/g, '\r\n')
  if (eol === 'CR') return text.replace(/\r\n|\r|\n/g, '\r')
  return text.replace(/\r\n|\r/g, '\n')
}

async function writeContentToDisk(content: string, doc: DocState, targetPath: string): Promise<boolean> {
  const settings = store.getState().settings
  let out = content
  if (settings.trim_trailing_white_space_on_save) {
    const nl = doc.eol === 'CRLF' ? '\r\n' : doc.eol === 'CR' ? '\r' : '\n'
    out = out.split(/\r\n|\r|\n/).map((l) => l.replace(/[ \t]+$/, '')).join(nl)
  }
  const eol: Eol = doc.eol === 'CRLF' ? 'CRLF' : doc.eol === 'CR' ? 'CR' : 'LF'
  if (settings.ensure_newline_at_eof_on_save && out.length > 0 && !/[\r\n]$/.test(out)) {
    out += eol === 'CRLF' ? '\r\n' : eol === 'CR' ? '\r' : '\n'
  }
  await api.writeFile(targetPath, out, { encoding: doc.encoding, eol })
  store.markSaved(targetPath, { value: out, encoding: doc.encoding, eol, mtime: Date.now() })
  void refreshGitGutter(targetPath)
  emitPluginEvent('file.save', { path: targetPath })
  return true
}

export async function saveActive(): Promise<boolean> {
  const path = getFocusedPath()
  const model = getFocusedModel()
  if (!path || !model) return false
  const doc = store.getState().documents.get(path)
  if (!doc) return false

  if (doc.untitled) {
    return saveUntitledAs(path, doc, model.getValue())
  }
  return writeContentToDisk(model.getValue(), doc, path)
}

async function saveUntitledAs(oldPath: string, doc: DocState, content: string): Promise<boolean> {
  const base = oldPath.startsWith('untitled://') ? oldPath.slice('untitled://'.length) : 'Untitled'
  const res = await api.saveDialog(`${base}.txt`)
  if (res.canceled || !res.path) return false
  const newPath = res.path
  const newDoc: DocState = {
    ...doc,
    path: newPath,
    untitled: false,
    language: languageForPath(newPath),
    dirty: false
  }
  store.setDocument(newPath, newDoc)
  store.addRecentFile(newPath)
  // 释放旧的 untitled 模型与文档
  disposeModel(oldPath)
  const oldDocs = store.getState().documents
  if (oldDocs.has(oldPath)) {
    store.closeDocument(oldPath)
  }
  const saved = await writeContentToDisk(content, newDoc, newPath)
  if (saved) ensureModel(newPath)
  return saved
}

export async function saveActiveAs(): Promise<boolean> {
  const path = getFocusedPath()
  const model = getFocusedModel()
  if (!path || !model) return false
  const doc = store.getState().documents.get(path)
  if (!doc) return false
  const res = await api.saveDialog(doc.untitled ? 'Untitled.txt' : undefined)
  if (res.canceled || !res.path) return false
  if (doc.untitled) return saveUntitledAs(path, doc, model.getValue())
  return writeContentToDisk(model.getValue(), doc, res.path)
}

export async function saveAll(): Promise<void> {
  const state = store.getState()
  for (const [path, doc] of state.documents) {
    if (doc.untitled) continue
    const model = getModel(path)
    if (model && doc.dirty) {
      await writeContentToDisk(model.getValue(), doc, path)
    }
  }
}

export function closeActive(): void {
  const path = getFocusedPath()
  if (!path) return
  const doc = store.getState().documents.get(path)
  if (doc?.dirty) {
    const name = path.startsWith('untitled://') ? path.slice('untitled://'.length) : path.split('/').pop()
    if (!window.confirm(`“${name}” 有未保存的更改，关闭后更改将丢失。是否继续？`)) return
  }
  if (!path.startsWith('untitled://')) store.pushClosedFile(path)
  store.closeDocument(path)
  disposeModel(path)
}

export function closePath(path: string): void {
  const doc = store.getState().documents.get(path)
  if (doc?.dirty) {
    if (!window.confirm(`“${path.split('/').pop()}” 有未保存的更改，是否关闭？`)) return
  }
  if (!path.startsWith('untitled://')) store.pushClosedFile(path)
  store.closeDocument(path)
  disposeModel(path)
}

// ---- 状态栏辅助 ----
export function currentEolLabel(): string {
  const path = getFocusedPath()
  const doc = path ? store.getState().documents.get(path) : undefined
  if (!doc) return 'LF'
  return doc.eol === 'CRLF' ? 'CRLF' : doc.eol === 'CR' ? 'CR' : 'LF'
}

export function currentEncodingLabel(): string {
  const path = getFocusedPath()
  const doc = path ? store.getState().documents.get(path) : undefined
  if (!doc) return 'UTF-8'
  return doc.encoding === 'utf8bom' ? 'UTF-8 with BOM' : doc.encoding === 'utf16le' ? 'UTF-16 LE' : 'UTF-8'
}

export function currentIndentLabel(): string {
  const s = store.getState().settings
  return (s.translate_tabs_to_spaces === false ? 'Tab Size: ' : 'Spaces: ') + String(s.tab_size ?? 4)
}

export function currentSyntaxLabel(): string | null {
  const path = getFocusedPath()
  if (!path) return null
  return store.getState().documents.get(path)?.language ?? null
}