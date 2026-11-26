import { app, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateInfo } from 'electron-updater'
import { IPC } from '@shared/types'

type Send = (channel: string, ...args: unknown[]) => void

let sendRef: Send | null = null

function send(channel: string, ...args: unknown[]): void {
  sendRef?.(channel, ...args)
}

function wire(): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => send(IPC.UPDATE_STATE, { state: 'checking' }))
  autoUpdater.on('update-available', (info: UpdateInfo) => send(IPC.UPDATE_STATE, { state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => send(IPC.UPDATE_STATE, { state: 'none' }))
  autoUpdater.on('update-downloaded', (info: UpdateInfo) =>
    send(IPC.UPDATE_STATE, { state: 'downloaded', version: info.version })
  )
  autoUpdater.on('error', (err) => send(IPC.UPDATE_STATE, { state: 'error', message: String(err?.message ?? err) }))
}

export function initAutoUpdater(sendFn: Send): void {
  sendRef = sendFn
  wire()
  // 说明：不在此处自动检查更新（发布未携带 latest-*.yml 时会导致启动弹报错）。
  // 更新改为由用户主动触发「Check for Updates…」命令。
}

export async function checkForUpdates(): Promise<void> {
  const current = app.getVersion()
  let latest = ''
  let url = 'https://github.com/Jack11843121/sample-text/releases'
  try {
    const res = await fetch('https://api.github.com/repos/Jack11843121/sample-text/releases/latest', {
      headers: { 'User-Agent': 'sample-text', Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = (await res.json()) as { tag_name?: string; html_url?: string }
    latest = String(data.tag_name ?? '').replace(/^v/, '')
    if (data.html_url) url = data.html_url
  } catch (err) {
    send(IPC.UPDATE_STATE, { state: 'error', message: '检查更新失败：' + String((err as Error)?.message ?? err) })
    await dialog.showMessageBox({
      type: 'error',
      title: '检查更新',
      message: '检查更新失败',
      detail: String((err as Error)?.message ?? err)
    })
    return
  }

  if (!latest || latest === current) {
    send(IPC.UPDATE_STATE, { state: 'none' })
    await dialog.showMessageBox({
      type: 'info',
      title: '检查更新',
      message: '已是最新版本',
      detail: '当前 v' + current
    })
    return
  }

  send(IPC.UPDATE_STATE, { state: 'available', version: latest })
  const r = await dialog.showMessageBox({
    type: 'info',
    title: '检查更新',
    message: `发现新版本 v${latest}`,
    detail: `当前版本 v${current}。可前往 GitHub 下载安装：`,
    buttons: ['前往下载', '取消'],
    defaultId: 0,
    cancelId: 1
  })
  if (r.response === 0) void shell.openExternal(url)
}

export function quitAndInstall(): void {
  try {
    autoUpdater.quitAndInstall()
  } catch (err) {
    send(IPC.UPDATE_STATE, { state: 'error', message: String((err as Error)?.message ?? err) })
  }
}