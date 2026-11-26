import { useSyncExternalStore } from 'react'
import { useAppState, store } from '../store'
import { getFocusedEditor, getFocusedModel, onEditorStatus, revealLineInEditor } from '../editor/session'
import { extractSymbols, type SymbolItem } from '../symbols'

let statusTick = 0
function useStatusTick(): number {
  return useSyncExternalStore(
    (l) =>
      onEditorStatus(() => {
        statusTick += 1
        l()
      }),
    () => statusTick
  )
}

function basename(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i >= 0 ? p.slice(i + 1) : p
}

export function Breadcrumb() {
  const state = useAppState()
  useStatusTick()
  const path = state.activePath
  if (!path) return null
  const editor = getFocusedEditor()
  const model = getFocusedModel()
  const line = editor?.getPosition()?.lineNumber ?? 1
  let sym: SymbolItem | null = null
  if (model) {
    const syms = extractSymbols(model)
    for (const s of syms) if (s.line <= line) sym = s
  }
  return (
    <div className="breadcrumb">
      <span className="crumb-file">📄 {basename(path)}</span>
      {sym && (
        <>
          <span className="crumb-sep">›</span>
          <span className="crumb-sym">{sym.name}</span>
        </>
      )}
    </div>
  )
}

export function OutlinePanel() {
  const state = useAppState()
  useStatusTick()
  if (!state.ui.outlineVisible) return null
  const model = getFocusedModel()
  const syms = model ? extractSymbols(model) : []
  return (
    <div className="outline-panel">
      <div className="outline-head">
        <span>大纲</span>
        <button className="ai-close" onClick={() => store.toggleOutline()}>×</button>
      </div>
      <div className="outline-body">
        {syms.length === 0 ? (
          <div className="outline-empty">当前文件无符号</div>
        ) : (
          syms.map((s) => (
            <div key={s.line + ':' + s.name} className="outline-item" title={'L' + s.line} onClick={() => revealLineInEditor(s.line)}>
              <span className="outline-kind">{s.kind}</span>
              <span className="outline-name">{s.name}</span>
              <span className="outline-line">L{s.line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}