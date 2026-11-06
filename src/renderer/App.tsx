import { useEffect, useRef, useState } from 'react'
import { store, useAppState } from './store'
import { EditorPane } from './components/EditorPane'
import { TabBar } from './components/TabBar'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { CommandPalette } from './components/CommandPalette'
import { BuildPanel } from './components/BuildPanel'
import { FindInFiles } from './components/FindInFiles'
import { openFile, reloadFile, refreshGitState, restoreWorkspace, persistWorkspace } from './io'
import { refreshGitGutter } from './features/gitGutter'
import { refreshBookmarks } from './features/bookmarks'
import { emitPluginEvent } from './plugins/host'
import { runCommand } from './commands/registry'
import { setKeybindings } from './keybindings/loader'
import { DEFAULT_KEYBINDINGS } from './keybindings/defaults'
import { IPC } from '@shared/types'

const api = window.sampleText

function Welcome() {
  // Sublime 风格：无欢迎页，空态即空白画布（通常因启动自动新建文件而不可见）
  return <div className="welcome" />
}

export default function App() {
  const state = useAppState()
  const [dragOver, setDragOver] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 初始化：键位 + 设置 + 主题 + 恢复上次会话（无则新建空文件，Sublime 行为）
  useEffect(() => {
    setKeybindings(DEFAULT_KEYBINDINGS)
    document.documentElement.dataset.platform = window.sampleText.platform
    void api.settingsGet().then((user) => store.setUserSettings(user))

    void restoreWorkspace().then(() => {
      if (store.getState().tabOrder.length === 0) store.newUntitled()
    })

    // 默认强制深色（Sublime 深色系），不跟随系统浅色
    store.setThemeBase('dark')
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = state.themeBase
  }, [state.themeBase])

  useEffect(() => {
    void refreshGitGutter(state.activePath)
    refreshBookmarks(state.activePath)
    if (state.activePath) emitPluginEvent('view.activated', { path: state.activePath })
  }, [state.activePath])

  // 会话持久化：文件夹 / 打开文件集合 / 活动文件变化时（防抖 600ms）保存
  useEffect(() => {
    const t = setTimeout(() => persistWorkspace(), 600)
    return () => clearTimeout(t)
  }, [state.folderPaths, state.tabOrder, state.activePath])

  // IPC 事件
  useEffect(() => {
    const offOpen = api.on(IPC.APP_OPEN_FILE, (paths) => {
      const list = (Array.isArray(paths) ? paths : [paths]) as string[]
      for (const p of list) {
        void openFile(p)
      }
    })
    const offMenu = api.on(IPC.MENU_COMMAND, (payload) => {
      const p = payload as { command: string; args?: Record<string, unknown> }
      runCommand(p.command, p.args)
    })
    const offFs = api.on(IPC.FS_CHANGED, (ev) => {
      const e = ev as { event: string; path: string }
      const docs = store.getState().documents
      const doc = docs.get(e.path)
      if (e.event === 'change' && doc && !doc.dirty) {
        void reloadFile(e.path)
      }
      if (e.event === 'add' || e.event === 'addDir' || e.event === 'unlink' || e.event === 'unlinkDir') {
        void refreshGitState()
        store.bumpTreeVersion()
      }
    })
    return () => {
      offOpen()
      offMenu()
      offFs()
    }
  }, [])

  const groups = state.groups
  const layoutClass = 'layout-' + state.layout
  const empty = state.tabOrder.length === 0

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    for (let i = 0; i < files.length; i++) {
      const f = files[i] as File & { path?: string }
      if (f.path) void openFile(f.path)
    }
  }

  return (
    <div
      className="app-root"
      ref={rootRef}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {dragOver ? <div className="drop-overlay">松开以打开文件 / 文件夹</div> : null}
      <div className="app-body">
        <Sidebar />
        <div className="main-col">
          <TabBar />
          <div className={'editor-area ' + layoutClass}>
            {empty ? (
              <Welcome />
            ) : (
              groups.map((g) => (
                <div
                  key={g.id}
                  className={'pane-wrap' + (g.id === state.activeGroupId ? ' active' : '')}
                  onMouseDownCapture={() => store.setActiveGroup(g.id)}
                >
                  <EditorPane groupId={g.id} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <BuildPanel />
      <FindInFiles />
      <StatusBar />
      <CommandPalette />
    </div>
  )
}