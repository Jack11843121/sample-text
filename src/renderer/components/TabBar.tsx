import { store, useAppState } from '../store'
import { closePath } from '../io'

function tabTitle(path: string): string {
  if (path.startsWith('untitled://')) return path.slice('untitled://'.length)
  const i = path.lastIndexOf('/')
  const j = path.lastIndexOf('\\')
  const s = Math.max(i, j)
  return s >= 0 ? path.slice(s + 1) : path
}

export function TabBar() {
  const state = useAppState()
  if (!state.ui.showTabs) return null
  const tabs = state.tabOrder
  if (tabs.length === 0) return null

  return (
    <div className="tabbar" role="tablist">
      {tabs.map((path) => {
        const doc = state.documents.get(path)
        const active = state.activePath === path
        return (
          <div
            key={path}
            role="tab"
            aria-selected={active}
            className={'tab' + (active ? ' active' : '') + (doc?.dirty ? ' dirty' : '')}
            title={path}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault()
                closePath(path)
                return
              }
              store.setActivePath(path)
            }}
          >
            <span className="tab-dot">{doc?.dirty ? '●' : ''}</span>
            <span className="tab-title">{tabTitle(path)}</span>
            <span
              className="tab-close no-drag"
              onClick={(e) => {
                e.stopPropagation()
                closePath(path)
              }}
            >
              ×
            </span>
          </div>
        )
      })}
    </div>
  )
}