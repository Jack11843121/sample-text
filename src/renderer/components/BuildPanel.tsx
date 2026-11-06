import { store, useAppState } from '../store'
import { openFile } from '../io'
import { revealLineInEditor } from '../editor/session'

export function BuildPanel() {
  const state = useAppState()
  const panel = state.ui.buildPanel
  if (!panel.open) return null

  return (
    <div className="panel build-panel">
      <div className="panel-header">
        <span className="panel-title">Build Results</span>
        <span className="panel-close no-drag" onClick={() => store.setBuildPanel({ open: false })}>
          ×
        </span>
      </div>
      <div className="panel-body">
        {panel.matches.length > 0 ? (
          <div className="build-matches">
            {panel.matches.map((m, i) => (
              <div
                key={i}
                className="build-match"
                onClick={() => {
                  if (m.file) {
                    void openFile(m.file).then(() => {
                      if (m.line) setTimeout(() => revealLineInEditor(m.line!), 60)
                    })
                  }
                }}
              >
                <span className="bm-file">{m.file?.split(/[/\\]/).pop() ?? ''}</span>
                {m.line ? <span className="bm-line">:{m.line}</span> : null}
                <span className="bm-msg">{m.message}</span>
              </div>
            ))}
          </div>
        ) : null}
        <pre className="build-output">{panel.output || '没有输出'}</pre>
      </div>
    </div>
  )
}