import { useEffect, useMemo, useRef, useState } from 'react'
import { store, useAppState } from '../store'
import { getCommandMetas, runCommand } from '../commands/registry'
import { getFocusedEditor, getFocusedModel, revealLineInEditor } from '../editor/session'
import { openFile } from '../io'
import { extractSymbols, type SymbolItem } from '../symbols'
import { buildProjectSymbolIndex, type ProjectSymbol } from '../symbolIndex'
import { fuzzyFilter, commonPrefix } from '@shared/fuzzy'
import { getAllSnippets, insertSnippetText } from '../features/completions'
import { listSchemes, applyScheme } from '../features/themes'

const api = window.sampleText

interface Item {
  id: string
  title: string
  detail?: string
  hint?: string
  run: () => void
}

function pathRelativeTo(base: string, path: string): string {
  if (path.startsWith(base)) return path.slice(base.length).replace(/^[/\\]/, '')
  return path
}

export function CommandPalette() {
  const state = useAppState()
  const palette = state.ui.palette
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [fileList, setFileList] = useState<string[]>([])
  const [projectSymbols, setProjectSymbols] = useState<ProjectSymbol[]>([])
  const [symbolsLoading, setSymbolsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const open = palette.open

  // 打开时加载文件列表 / 聚焦
  useEffect(() => {
    if (!open) return
    setQuery(palette.prefix ?? '')
    setActiveIndex(0)
    inputRef.current?.focus()
    if (palette.mode === 'file' && fileList.length === 0 && state.folderPaths.length > 0) {
      void (async () => {
        const all: string[] = []
        for (const f of state.folderPaths) {
          all.push(...(await api.listFiles(f)))
        }
        setFileList(all)
      })()
    }
    if (palette.mode === 'symbol_project') {
      setSymbolsLoading(true)
      void buildProjectSymbolIndex().then((syms) => {
        setProjectSymbols(syms)
        setSymbolsLoading(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, palette.mode, palette.prefix])

  const items: Item[] = useMemo(() => {
    if (!open) return []
    switch (palette.mode) {
      case 'command': {
        return getCommandMetas().map((m) => ({
          id: m.command,
          title: m.title,
          detail: m.category,
          run: () => runCommand(m.command)
        }))
      }
      case 'file': {
        const root = commonPrefix(state.folderPaths)
        return fileList.map((p) => {
          const rel = root ? pathRelativeTo(root, p) : p
          return {
            id: p,
            title: rel.split(/[/\\]/).pop() ?? p,
            detail: rel,
            hint: p,
            run: () => void openFile(p)
          }
        })
      }
      case 'symbol': {
        const model = getFocusedModel()
        if (!model) return []
        return extractSymbols(model).map((s: SymbolItem) => ({
          id: `${s.line}:${s.name}`,
          title: s.name,
          detail: s.detail,
          hint: `L${s.line}`,
          run: () => revealLineInEditor(s.line)
        }))
      }
      case 'symbol_project': {
        if (symbolsLoading) {
          return [{ id: 'loading', title: '正在建立项目符号索引…', run: () => {} }]
        }
        return projectSymbols.map((s) => ({
          id: `${s.file}:${s.line}:${s.name}`,
          title: s.name,
          detail: s.kind + ' · ' + (s.file.split(/[/\\]/).pop() ?? s.file),
          hint: `L${s.line}`,
          run: () => {
            void openFile(s.file).then(() => {
              setTimeout(() => revealLineInEditor(s.line), 80)
            })
          }
        }))
      }
      case 'line': {
        const n = parseInt(query, 10)
        if (!Number.isFinite(n) || n < 1) return []
        return [
          {
            id: 'line',
            title: `跳转到第 ${n} 行`,
            hint: query,
            run: () => revealLineInEditor(n)
          }
        ]
      }
      case 'snippet': {
        return getAllSnippets().map((s) => ({
          id: 'snippet:' + s.name,
          title: s.tabTrigger || s.name || 'snippet',
          detail: s.description || s.name,
          hint: s.scope,
          run: () => insertSnippetText(s.content)
        }))
      }
      case 'color_scheme': {
        return listSchemes().map((s) => ({
          id: 'scheme:' + s.name,
          title: s.name,
          detail: s.isDark === false ? '浅色' : '深色',
          hint: state.activeColorScheme === s.name ? '✓ 当前' : '',
          run: () => applyScheme(s.name)
        }))
      }
      default:
        return []
    }
  }, [open, palette.mode, fileList, state.folderPaths, query, projectSymbols, symbolsLoading, state.activeColorScheme])

  const results = useMemo(() => {
    if (palette.mode === 'line') return items
    if (query.trim().length === 0) return items.slice(0, 200)
    const filtered = fuzzyFilter(query, items, (it) => it.title)
    return filtered.slice(0, 200).map((f) => f.item)
  }, [items, query, palette.mode])

  if (!open) return null

  const placeholder =
    palette.mode === 'command'
      ? '命令…'
      : palette.mode === 'file'
        ? 'Goto Anything…'
        : palette.mode === 'symbol'
          ? 'Goto Symbol…'
          : palette.mode === 'line'
            ? 'Goto Line…'
            : palette.mode === 'snippet'
              ? '插入代码片段…'
              : palette.mode === 'color_scheme'
                ? '选择配色方案…'
                : 'Goto Symbol in Project…'

  function commit(index: number): void {
    const r = results[index]
    if (!r) return
    r.run()
    store.closePalette()
    getFocusedEditor()?.focus()
  }

  return (
    <div className="palette-mask" onMouseDown={(e) => {
      if (e.target === e.currentTarget) store.closePalette()
    }}>
      <div className="palette">
        <input
          ref={inputRef}
          className="palette-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              commit(activeIndex)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              store.closePalette()
              getFocusedEditor()?.focus()
            }
          }}
        />
        <div className="palette-list">
          {results.length === 0 ? (
            <div className="palette-empty">无匹配结果</div>
          ) : (
            results.slice(0, 200).map((r, i) => (
              <div
                key={r.id}
                className={'palette-item' + (i === activeIndex ? ' active' : '')}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(i)}
              >
                <span className="pi-title">{r.title}</span>
                {r.detail ? <span className="pi-detail">{r.detail}</span> : null}
                {r.hint ? <span className="pi-hint">{r.hint}</span> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}