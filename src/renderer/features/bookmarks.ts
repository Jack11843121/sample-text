import * as monaco from 'monaco-editor'
import { getFocusedEditor, getFocusedModel, getFocusedPath, editorsForPath } from '../editor/session'

/**
 * 书签系统：按文件记录书签行，gutter 显示标记，支持 next/prev/select/clear。
 */

const bookmarks = new Map<string, Set<number>>()
const collections = new Map<monaco.editor.IStandaloneCodeEditor, monaco.editor.IEditorDecorationsCollection>()

function marksFor(path: string): Set<number> {
  let s = bookmarks.get(path)
  if (!s) {
    s = new Set()
    bookmarks.set(path, s)
  }
  return s
}

function render(path: string | null): void {
  const editors = path ? editorsForPath(path) : []
  const marks = path ? marksFor(path) : new Set<number>()
  // 更新该文件所有编辑器；同时清理其它编辑器旧装饰
  for (const e of editors) {
    const deltas: monaco.editor.IModelDeltaDecoration[] = []
    for (const line of marks) {
      deltas.push({
        range: new monaco.Range(line, 1, line, 1),
        options: { isWholeLine: false, glyphMarginClassName: 'bookmark-gutter' }
      })
    }
    const prev = collections.get(e)
    prev?.clear()
    collections.set(e, e.createDecorationsCollection(deltas))
  }
}

function locate(path: string): { line: number; col: number } | null {
  const editor = getFocusedEditor()
  if (!editor) return null
  const pos = editor.getPosition()
  return pos ? { line: pos.lineNumber, col: pos.column } : null
}

export function toggleBookmark(): void {
  const path = getFocusedPath()
  const pos = locate(path ?? '')
  if (!path || !pos) return
  const marks = marksFor(path)
  if (marks.has(pos.line)) marks.delete(pos.line)
  else marks.add(pos.line)
  render(path)
}

export function nextBookmark(): void {
  const path = getFocusedPath()
  const editor = getFocusedEditor()
  if (!path || !editor) return
  const marks = [...marksFor(path)].sort((a, b) => a - b)
  if (marks.length === 0) return
  const cur = editor.getPosition()?.lineNumber ?? 1
  const next = marks.find((l) => l > cur)
  const target = next ?? marks[0]
  editor.setPosition({ lineNumber: target, column: 1 })
  editor.revealLineInCenter(target)
  editor.focus()
}

export function prevBookmark(): void {
  const path = getFocusedPath()
  const editor = getFocusedEditor()
  if (!path || !editor) return
  const marks = [...marksFor(path)].sort((a, b) => a - b)
  if (marks.length === 0) return
  const cur = editor.getPosition()?.lineNumber ?? 1
  const prev = [...marks].reverse().find((l) => l < cur)
  const target = prev ?? marks[marks.length - 1]
  editor.setPosition({ lineNumber: target, column: 1 })
  editor.revealLineInCenter(target)
  editor.focus()
}

export function selectAllBookmarks(): void {
  const path = getFocusedPath()
  const editor = getFocusedEditor()
  const model = getFocusedModel()
  if (!path || !editor || !model) return
  const marks = [...marksFor(path)].sort((a, b) => a - b)
  if (marks.length === 0) return
  const sels = marks.map((line) => new monaco.Selection(line, 1, line, model.getLineMaxColumn(line)))
  editor.setSelections(sels)
  editor.focus()
}

export function clearBookmarks(): void {
  const path = getFocusedPath()
  if (!path) return
  bookmarks.delete(path)
  render(path)
}

/** 外部打开新文件时补刷该文件的书签标记 */
export function refreshBookmarks(path: string | null): void {
  render(path)
}