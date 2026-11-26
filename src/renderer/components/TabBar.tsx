import { store, useAppState } from '../store'
import { closePath, closePaths } from '../io'

const api = window.sampleText

function tabTitle(path: string): string {
  if (path.startsWith('untitled://')) return path.slice('untitled://'.length)
  const i = path.lastIndexOf('/')
  const j = path.lastIndexOf('\\')
  const s = Math.max(i, j)
  return s >= 0 ? path.slice(s + 1) : path
}

async function openTabMenu(path: string): Promise<void> {
  // 先激活该标签，让「关闭右侧/左侧」以其为基准
  store.setActivePath(path)
  const action = await api.showContextMenu([
    { id: 'close', label: '关闭' },
    { id: 'close_others', label: '关闭其他' },
    { id: 'close_right', label: '关闭右侧' },
    { id: 'close_left', label: '关闭左侧' },
    { id: 'close_all', label: '全部关闭' }
  ])
  if (!action) return
  const tabOrder = store.getState().tabOrder
  const i = tabOrder.indexOf(path)
  if (action === 'close') closePath(path)
  else if (action === 'close_others') closePaths(tabOrder.filter((p) => p !== path))
  else if (action === 'close_right') closePaths(i >= 0 ? tabOrder.slice(i + 1) : [])
  else if (action === 'close_left') closePaths(i >= 0 ? tabOrder.slice(0, i) : [])
  else if (action === 'close_all') closePaths([...tabOrder])
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
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void openTabMenu(path)
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