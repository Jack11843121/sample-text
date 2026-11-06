import { useState } from 'react'
import { store, useAppState } from '../store'
import { openFile } from '../io'
import { revealLineInEditor } from '../editor/session'
import type { SearchHit } from '@shared/types'

const api = window.sampleText

export function FindInFiles() {
  const state = useAppState()
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [regex, setRegex] = useState(false)
  const [hits, setHits] = useState<SearchHit[]>([])
  const [running, setRunning] = useState(false)

  if (!state.ui.findInFilesOpen) return null

  async function run(): Promise<void> {
    if (!query.trim()) return
    setRunning(true)
    setHits([])
    const folders = state.folderPaths
    const results = await api.searchInFiles(folders, { query, caseSensitive, regex, wholeWord: false })
    setHits(results)
    setRunning(false)
  }

  return (
    <div className="panel find-panel">
      <div className="panel-header">
        <span className="panel-title">Find in Files</span>
        <span className="panel-close no-drag" onClick={() => store.setFindInFilesOpen(false)}>
          ×
        </span>
      </div>
      <div className="find-bar">
        <input
          className="find-input"
          placeholder="搜索…"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run()
            if (e.key === 'Escape') store.setFindInFilesOpen(false)
          }}
        />
        <label className="find-opt">
          <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
          区分大小写
        </label>
        <label className="find-opt">
          <input type="checkbox" checked={regex} onChange={(e) => setRegex(e.target.checked)} />
          正则
        </label>
        <button onClick={() => void run()} disabled={running}>
          {running ? '搜索中…' : '搜索'}
        </button>
      </div>
      <div className="panel-body">
        <div className="find-results">
          {hits.slice(0, 500).map((h, i) => (
            <div
              key={i}
              className="find-hit"
              onClick={() => {
                void openFile(h.path).then(() => {
                  setTimeout(() => revealLineInEditor(h.line), 60)
                })
              }}
            >
              <span className="fh-file">{h.path.split(/[/\\]/).pop()}</span>
              <span className="fh-line">:{h.line}:{h.column}</span>
              <span className="fh-text">{h.text}</span>
            </div>
          ))}
          {!running && hits.length === 0 ? <div className="find-count">无结果</div> : null}
          {hits.length > 0 ? <div className="find-count">{hits.length} 处匹配</div> : null}
        </div>
      </div>
    </div>
  )
}