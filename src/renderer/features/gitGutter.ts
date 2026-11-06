import * as monaco from 'monaco-editor'
import { store } from '../store'
import { getModel, editorsForPath } from '../editor/session'
import type { LineDiff } from '@shared/types'

const api = window.sampleText

const collections = new Map<monaco.editor.IStandaloneCodeEditor, monaco.editor.IEditorDecorationsCollection>()

function decorationsFor(diff: LineDiff): monaco.editor.IModelDeltaDecoration[] {
  const ds: monaco.editor.IModelDeltaDecoration[] = []
  for (const line of diff.added) {
    ds.push({
      range: new monaco.Range(line, 1, line, 1),
      options: { isWholeLine: true, className: 'git-added-line', zIndex: 1 }
    })
  }
  for (const line of diff.modified) {
    ds.push({
      range: new monaco.Range(line, 1, line, 1),
      options: { isWholeLine: true, className: 'git-modified-line', zIndex: 1 }
    })
  }
  for (const anchor of diff.deleted) {
    ds.push({
      range: new monaco.Range(anchor, 1, anchor, 1),
      options: { isWholeLine: false, glyphMarginClassName: 'git-deleted-gutter', zIndex: 2 }
    })
  }
  return ds
}

function clearGutter(path: string): void {
  const editors = editorsForPath(path)
  for (const e of editors) {
    collections.get(e)?.clear()
    collections.delete(e)
  }
}

export async function refreshGitGutter(path: string | null): Promise<void> {
  if (!path) return
  clearGutter(path)
  if (path.startsWith('untitled://')) return
  const folder = store.getState().folderPaths[0]
  const repo = store.getState().gitState?.isRepo
  if (!folder || !repo) return
  const model = getModel(path)
  if (!model) return

  const diff = await api.gitDiffLines(folder, path)
  const editors = editorsForPath(path)
  for (const e of editors) {
    const prev = collections.get(e)
    prev?.clear()
    collections.set(e, e.createDecorationsCollection(decorationsFor(diff)))
  }
}