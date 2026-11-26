import { useState } from 'react'
import { store, useAppState } from '../store'
import { closePath, closePaths } from '../io'
import { renameModel } from '../editor/session'

const api = window.sampleText

function tabTitle(path: string): string {
  if (path.startsWith('untitled://')) return path.slice('untitled://'.length)
  const i = path.lastIndexOf('/')
  const j = path.lastIndexOf('\\')
  const s = Math.max(i, j)
  return s >= 0 ? path.slice(s + 1) : path
}

async function renameTab(path: string): Promise<void> {
  if (path.startsWith('untitled://')) return
  const dir = path.replace(/[^/\\]+$/, '')
  const base = path.split(/[/\\]/).pop() ?? path
  const newName = window.prompt('重命名文件为：', base)
  if (!newName || !newName.trim() || newName.trim() === base) return
  const newPath = dir + newName.trim()
  try {
    await api.renamePath(path, newPath)
    renameModel(path, newPath)
    store.renamePath(path, newPath)
    store.bumpTreeVersion()
    store.notify('已重命名为 ' + newName.trim())
  } catch (e) {
    store.notify('重命名失败：' + String((e as Error)?.message ?? e), 5000)
  }
}

async function openTabMenu(path: string): Promise<void> {
  store.setActivePath(path)
  const pinned = store.getState().pinnedTabs.includes(path)
  const action = await api.showContextMenu([
    { id: 'close', label: '关闭' },
    { id: 'close_saved', label: '关闭已保存' },
    { id: 'close_others', label: '关闭其他' },
    { id: 'close_right', label: '关闭右侧' },
    { id: 'close_left', label: '关闭左侧' },
    { id: 'close_all', label: '全部关闭' },
    { id: 'pin', label: pinned ? '取消固定' : '固定' }
  ])
  if (!action) return
  const s = store.getState()
  const tabOrder = s.tabOrder
  const i = tabOrder.indexOf(path)
  if (action === 'close') closePath(path)
  else if (action === 'close_saved') closePaths(tabOrder.filter((p) => p !== path && !s.documents.get(p)?.dirty))
  else if (action === 'close_others') closePaths(tabOrder.filter((p) => p !== path && !s.pinnedTabs.includes(p)))
  else if (action === 'close_right') closePaths(i >= 0 ? tabOrder.slice(i + 1) : [])
  else if (action === 'close_left') closePaths(i >= 0 ? tabOrder.slice(0, i) : [])
  else if (action === 'close_all') closePaths([...tabOrder])
  else if (action === 'pin') store.togglePin(path)
}

export function TabBar() {
  const state = useAppState()
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  if (!state.ui.showTabs) return null
  const tabs = state.tabOrder
  if (tabs.length === 0) return null

  return (
    <div className="tabbar" role="tablist">
      {tabs.map((path, index) => {
        const doc = state.documents.get(path)
        const active = state.activePath === path
        const pinned = state.pinnedTabs.includes(path)
        return (
          <div
            key={path}
            role="tab"
            aria-selected={active}
            draggable
            className={'tab' + (active ? ' active' : '') + (doc?.dirty ? ' dirty' : '') + (pinned ? ' pinned' : '')}
            title={path}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              setDragIdx(index)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIdx != null && dragIdx !== index) {
                store.moveTab(dragIdx, index)
              }
              setDragIdx(null)
            }}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault()
                closePath(path)
                return
              }
              store.setActivePath(path)
            }}
            onDoubleClick={() => {
              void renameTab(path)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void openTabMenu(path)
            }}
          >
            <span className="tab-pin">{pinned ? '📌' : ''}</span>
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