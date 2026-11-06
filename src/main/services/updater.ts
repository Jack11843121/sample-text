import { app } from 'electron'
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
  // 启动后延迟自动检查（仅打包环境，且已配置更新源）
  if (app.isPackaged) {
    setTimeout(() => {
      void checkForUpdates().catch(() => undefined)
    }, 8000)
  }
}

export async function checkForUpdates(): Promise<void> {
  if (!app.isPackaged) {
    send(IPC.UPDATE_STATE, { state: 'error', message: '开发模式下无法检查更新' })
    return
  }
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    send(IPC.UPDATE_STATE, {
      state: 'error',
      message: `检查更新失败：${String((err as Error)?.message ?? err)}`
    })
  }
}

export function quitAndInstall(): void {
  try {
    autoUpdater.quitAndInstall()
  } catch (err) {
    send(IPC.UPDATE_STATE, { state: 'error', message: String((err as Error)?.message ?? err) })
  }
}