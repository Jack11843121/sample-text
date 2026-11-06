import { useEffect, useRef, useState } from 'react'
import { store, useAppState } from './store'
import { EditorPane } from './components/EditorPane'
import { TabBar } from './components/TabBar'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { CommandPalette } from './components/CommandPalette'
import { BuildPanel } from './components/BuildPanel'
import { FindInFiles } from './components/FindInFiles'
import { openFile, reloadFile, refreshGitState } from './io'
import { refreshGitGutter } from './features/gitGutter'
import { refreshBookmarks } from './features/bookmarks'
import { emitPluginEvent } from './plugins/host'
import { runCommand } from './commands/registry'
import { setKeybindings } from './keybindings/loader'
import { DEFAULT_KEYBINDINGS } from './keybindings/defaults'
import { IPC } from '@shared/types'

const api = window.sampleText

function Welcome() {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <h1>sample<em>-text</em></h1>
        <p className="welcome-sub">轻量 · 跨平台 · 文本处理与代码编辑</p>
        <div className="welcome-actions">
          <button onClick={() => runCommand('new_file')}>新建文件</button>
          <button onClick={() => runCommand('open_file_dialog')}>打开文件…</button>
          <button onClick={() => runCommand('open_folder_dialog')}>打开文件夹…</button>
        </div>
        <div className="welcome-hints">
          <div><kbd>⌘P</kbd> Goto Anything</div>
          <div><kbd>⌘⇧P</kbd> 命令面板</div>
          <div><kbd>⌘D</kbd> 多光标选中下一个</div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const state = useAppState()
  const [dragOver, setDragOver] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 初始化：键位 + 设置 + 主题
  useEffect(() => {
    setKeybindings(DEFAULT_KEYBINDINGS)
    void api.settingsGet().then((user) => store.setUserSettings(user))

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = (): void => store.setThemeBase(mq.matches ? 'dark' : 'light')
    applyTheme()
    mq.addEventListener('change', applyTheme)
    return () => mq.removeEventListener('change', applyTheme)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = state.themeBase
  }, [state.themeBase])

  useEffect(() => {
    void refreshGitGutter(state.activePath)
    refreshBookmarks(state.activePath)
    if (state.activePath) emitPluginEvent('view.activated', { path: state.activePath })
  }, [state.activePath])

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