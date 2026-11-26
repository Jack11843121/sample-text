import * as monaco from 'monaco-editor'
import { registerCommand, registerCommandMeta } from '../commands/registry'
import { getFocusedEditor, getFocusedModel } from '../editor/session'
import { store } from '../store'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 词法级重命名：替换当前文件内所有词边界匹配（本地、快速、无需 LSP） */
export function renameSymbol(): void {
  const editor = getFocusedEditor()
  const model = getFocusedModel()
  if (!editor || !model) return
  const pos = editor.getPosition()
  if (!pos) return
  const word = model.getWordAtPosition(pos)
  if (!word) {
    store.notify('光标处没有可重命名的符号', 3000)
    return
  }
  const oldName = word.word
  const newName = window.prompt(`重命名「${oldName}」为：`, oldName)
  if (!newName || !newName.trim() || newName.trim() === oldName) return

  const target = newName.trim()
  const re = new RegExp('\\b' + escapeRegExp(oldName) + '\\b', 'g')
  const text = model.getValue()
  const edits: monaco.editor.IIdentifiedSingleEditOperation[] = []
  let m: RegExpExecArray | null
  let count = 0
  while ((m = re.exec(text)) !== null) {
    const start = model.getPositionAt(m.index)
    const end = model.getPositionAt(m.index + oldName.length)
    edits.push({
      range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
      text: target
    })
    count++
  }
  if (count === 0) {
    store.notify('未找到可替换的符号', 3000)
    return
  }
  model.pushEditOperations([], edits, () => null)
  editor.setPosition(pos)
  store.notify(`已重命名 ${count} 处「${oldName}」→「${target}」`)
}

registerCommand('rename_symbol', () => renameSymbol())
registerCommandMeta({ command: 'rename_symbol', title: '重命名符号 (Rename Symbol)', category: 'Edit' })

// 注册 RenameProvider，以便 Monaco 的 editor.action.rename 也能走这里
monaco.languages.registerRenameProvider('*', {
  provideRenameEdits: (model, position, newName) => {
    const word = model.getWordAtPosition(position)
    const oldName = word?.word ?? ''
    if (!oldName || oldName === newName) return null
    const re = new RegExp('\\b' + escapeRegExp(oldName) + '\\b', 'g')
    const text = model.getValue()
    const edits: monaco.languages.WorkspaceEdit = { edits: [] }
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const start = model.getPositionAt(m.index)
      const end = model.getPositionAt(m.index + oldName.length)
      edits.edits!.push({
        resource: model.uri,
        versionId: model.getVersionId(),
        textEdit: { range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column), text: newName }
      })
    }
    return edits
  },
  resolveRenameLocation: (model, position) =>
    ({ range: model.getWordAtPosition(position) ? new monaco.Range(position.lineNumber, 1, position.lineNumber, 1) : new monaco.Range(1, 1, 1, 1), text: model.getWordAtPosition(position)?.word ?? '' })
})