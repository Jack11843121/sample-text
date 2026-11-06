import { app, BrowserWindow, Menu, shell, session } from 'electron'
import { join } from 'path'
import { tmpdir } from 'os'
import { registerIpc } from './ipc'
import { buildMenu } from './menu'
import { IPC } from '../shared/types'

const HEADLESS = process.env.SAMPLE_TEXT_HEADLESS === '1'

// 兜底：主进程未捕获异常不再弹原生错误框，改为记录日志
process.on('uncaughtException', (err) => {
  console.error('[main:uncaughtException]', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[main:unhandledRejection]', reason)
})

// 无头自检：把 userData 切到可写临时目录（绕过沙箱对 ~/Library 的写限制）
if (HEADLESS) {
  app.setPath('userData', join(tmpdir(), 'sample-text-headless'))
}

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

    if (HEADLESS) {
      void runHeadlessSelfCheck(mainWindow)
    }

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

  win.once('ready-to-show', () => {
    if (!HEADLESS) win.show()
  })

  if (HEADLESS) {
    win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      if (level >= 2) console.log('[renderer:' + level + ']', message, '@' + line, sourceId)
    })
  }

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

/** 无头自检：验证 preload/渲染层挂载与 IPC 往返（CI / 排障用） */
async function runHeadlessSelfCheck(win: BrowserWindow): Promise<void> {
  win.webContents.once('did-finish-load', async () => {
    await new Promise((r) => setTimeout(r, 2500))
    const results: Record<string, unknown> = {}
    const ck = async (name: string, expr: string) => {
      try {
        results[name] = await win.webContents.executeJavaScript(expr, true)
      } catch (e) {
        results[name] = 'ERR:' + String((e as Error).message)
      }
    }
    await ck('api', 'typeof window.sampleText')
    await ck('rootChildren', 'document.getElementById("root") ? document.getElementById("root").children.length : -1')
    await ck('settingsGet', 'window.sampleText.settingsGet().then(()=>"resolve").catch(e=>"REJECT:"+e.message)')
    await ck('listPackages', 'window.sampleText.listPackages().then(r=>"resolve:"+r.length).catch(e=>"REJECT:"+e.message)')
    await ck('readFile', 'window.sampleText.readFile("/etc/hosts").then(r=>"resolve:"+r.content.length).catch(e=>"REJECT:"+e.message)')
    await ck('stat', 'window.sampleText.stat("/etc/hosts").then(r=>"resolve:"+r.exists).catch(e=>"REJECT:"+e.message)')
    await ck('openDialog', 'Promise.race([window.sampleText.openDialog().then(r=>"resolve:"+r.canceled+":"+(r.paths||[]).length).catch(e=>"REJECT:"+e.message), new Promise(res=>setTimeout(()=>res("TIMEOUT"),4000))])')
    await ck('openFolderDialog', 'Promise.race([window.sampleText.openFolderDialog().then(r=>"resolve:"+r.canceled).catch(e=>"REJECT:"+e.message), new Promise(res=>setTimeout(()=>res("TIMEOUT"),4000))])')
    // 真实点击测试：点「新建文件」按钮（不依赖原生对话框），验证 React 点击链路
    // 启动即新建空文件 + Monaco 编辑器创建 + 标签渲染
    await ck(
      'startup',
      `(async()=>{
        await new Promise(r=>setTimeout(r,2000))
        return 'tabs='+document.querySelectorAll('.tab').length+' editors='+document.querySelectorAll('.monaco-editor').length+' lines='+document.querySelectorAll('.view-lines').length
      })()`
    )
    // 快捷键：Cmd/Ctrl+Shift+P 打开命令面板（验证 React 重渲染 + 键位）
    await ck(
      'paletteKey',
      `(async()=>{
        const meta = window.sampleText.platform==='darwin'
        window.dispatchEvent(new KeyboardEvent('keydown',{key:'P',shiftKey:true,metaKey:meta,ctrlKey:!meta,bubbles:true,cancelable:true}))
        await new Promise(r=>setTimeout(r,400))
        return 'palette='+!!document.querySelector('.palette')+' input='+!!document.querySelector('.palette-input')
      })()`
    )
    // 文件监视专项测试：真实建目录→挂载→新增文件→验证渲染层收到 FS_CHANGED
    const watchDir = join(tmpdir(), 'st-watch-' + Date.now())
    {
      const fsp = await import('fs/promises')
      await fsp.mkdir(watchDir, { recursive: true })
      await fsp.writeFile(join(watchDir, 'a.txt'), 'a')
    }
    await ck('watchSetup', `(async()=>{
      window.__fsEvents=[]
      window.sampleText.on('fs:changed',(ev)=>{window.__fsEvents.push(ev)})
      await window.sampleText.watchProjectPaths(['${watchDir}'])
      return 'done'
    })()`)
    {
      const fsp = await import('fs/promises')
      await fsp.writeFile(join(watchDir, 'b.txt'), 'b')
    }
    await new Promise((r) => setTimeout(r, 2500))
    await ck('watchEvents', `JSON.stringify((window.__fsEvents||[]).map(e=>e.event+':'+String(e.path||'').split('/').pop()))`)
    console.log('SELFTEST=' + JSON.stringify(results))
    app.quit()
    setTimeout(() => app.exit(0), 3000)
  })
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