import { app, BrowserWindow, Menu, shell, session } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { buildMenu } from './menu'
import { IPC } from '../shared/types'

// 单实例锁：CLI 二次调用时聚焦已有窗口
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null
  const pendingOpenPaths: string[] = []

  function focusOrOpen(paths: string[]): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      if (paths.length > 0) {
        mainWindow.webContents.send(IPC.APP_OPEN_FILE, paths)
      }
    } else {
      pendingOpenPaths.push(...paths)
    }
  }

  app.on('second-instance', (_event, argv) => {
    focusOrOpen(parseOpenPaths(argv))
  })

  // macOS Finder 打开文件
  app.on('open-file', (event, path) => {
    event.preventDefault()
    focusOrOpen([path])
  })

  app.whenReady().then(() => {
    // 安全基线：默认拒绝所有权限请求
    session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => callback(false))

    mainWindow = createMainWindow()
    registerIpc(mainWindow)
    Menu.setApplicationMenu(buildMenu(mainWindow))

    const initial = [...parseOpenPaths(process.argv), ...pendingOpenPaths]
    if (initial.length > 0) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow?.webContents.send(IPC.APP_OPEN_FILE, initial)
      })
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow()
        registerIpc(mainWindow)
        Menu.setApplicationMenu(buildMenu(mainWindow))
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 640,
    minHeight: 420,
    title: 'sample-text',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1e1e1e',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false
    }
  })

  win.once('ready-to-show', () => win.show())

  // 阻止页面导航，保持安全边界
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:') && !url.startsWith('devtools:')) e.preventDefault()
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

/** 解析命令行中要打开的路径（过滤掉 electron 及 app 自身参数） */
function parseOpenPaths(argv: string[]): string[] {
  const out: string[] = []
  for (const arg of argv) {
    if (arg === '--new-window' || arg === '-n' || arg === '--wait' || arg === '-w') continue
    if (arg.startsWith('-')) continue
    if (/electron/i.test(arg)) continue
    if (arg.endsWith('sample-text') || arg.endsWith('sample-text')) continue
    out.push(arg)
  }
  return out
}

export { createMainWindow }