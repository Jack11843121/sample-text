import { useSyncExternalStore } from 'react'
import { useAppState } from '../store'
import { getFocusedEditor, getFocusedModel, onEditorStatus } from '../editor/session'
import { currentEncodingLabel, currentEolLabel, currentIndentLabel } from '../io'

let statusVersion = 0
function useStatusTick(): number {
  return useSyncExternalStore(
    (l) =>
      onEditorStatus(() => {
        statusVersion += 1
        l()
      }),
    () => statusVersion
  )
}

export function StatusBar() {
  const state = useAppState()
  useStatusTick()
  if (!state.ui.showStatusBar) return null

  const editor = getFocusedEditor()
  const model = getFocusedModel()
  const pos = editor?.getPosition()
  const sel = editor?.getSelection()
  const line = pos?.lineNumber ?? 1
  const col = pos?.column ?? 1
  const selCount = editor?.getSelections()?.length ?? 1

  const lang = model?.getLanguageId() ?? 'Plain Text'
  const git = state.gitState

  return (
    <footer className="statusbar">
      <div className="status-item">行 {line}, 列 {col}</div>
      {selCount > 1 ? <div className="status-item">{selCount} 个选择</div> : null}
      {sel && !sel.isEmpty() ? (
        <div className="status-item">
          选中 {sel.endLineNumber - sel.startLineNumber + 1} 行
        </div>
      ) : null}
      {state.ui.macroRecording ? <div className="status-item status-macro">● REC</div> : null}
      {state.ui.statusMessage ? <div className="status-item status-msg">{state.ui.statusMessage}</div> : null}
      <div className="status-spacer" />
      <div className="status-item">{lang}</div>
      <div className="status-item">{currentIndentLabel()}</div>
      <div className="status-item">{currentEncodingLabel()}</div>
      <div className="status-item">{currentEolLabel()}</div>
      {git?.isRepo ? (
        <div className="status-item status-git">
          {git.branch ?? 'HEAD'} {git.staged}+{git.unstaged}±{git.untracked}?
        </div>
      ) : null}
    </footer>
  )
}