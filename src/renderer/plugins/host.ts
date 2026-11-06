import { registerCommand, registerCommandMeta, runCommand, type CommandHandler } from '../commands/registry'
import { store } from '../store'

/**
 * JS 插件宿主（信任模型与 Sublime 一致：用户安装的包即受信代码，进程内运行）。
 * 插件位于每个包的 plugin.js 文件，通过约定的全局 API 贡献命令、订阅事件。
 */

export type PluginEvent = 'file.open' | 'file.save' | 'view.activated'

export interface PluginCommandDef {
  command: string
  title: string
  category?: string
  description?: string
}

export interface PluginApi {
  name: string
  registerCommand(def: PluginCommandDef, handler: CommandHandler): void
  addCommand(def: PluginCommandDef, handler: CommandHandler): void
  on(event: PluginEvent, handler: (payload: unknown) => void): void
  notify(message: string, timeoutMs?: number): void
  log(...args: unknown[]): void
  store: {
    getSetting(key: string, fallback?: unknown): unknown
    run(command: string, args?: Record<string, unknown>): boolean
  }
}

const listeners = new Map<PluginEvent, Array<(payload: unknown) => void>>()
const loadedPlugins: string[] = []

const api = window.sampleText

function makeApi(packageName: string): PluginApi {
  function registerCmd(def: PluginCommandDef, handler: CommandHandler): void {
    registerCommand(def.command, handler)
    registerCommandMeta({ command: def.command, title: def.title, category: def.category, description: def.description })
  }
  return {
    name: packageName,
    registerCommand: registerCmd,
    addCommand: registerCmd,
    on(event, handler) {
      const list = listeners.get(event) ?? []
      list.push(handler)
      listeners.set(event, list)
    },
    notify(message, timeoutMs = 3000) {
      store.notify(String(message), timeoutMs)
    },
    log(...args) {
      console.log(`[plugin:${packageName}]`, ...args)
    },
    store: {
      getSetting(key, fallback) {
        const v = store.getState().settings[key]
        return v === undefined ? fallback : v
      },
      run(command, args) {
        return runCommand(command, args)
      }
    }
  }
}

/** 执行单个插件源码 */
function executePlugin(packageName: string, source: string): void {
  try {
    // 插件以受信代码执行（Sublime 同款信任模型）；api 为唯一注入对象
    const fn = new Function('api', 'console', source)
    fn(makeApi(packageName), console)
    loadedPlugins.push(packageName)
  } catch (err) {
    console.error(`[plugins] ${packageName} 加载失败`, err)
  }
}

/** 扫描并加载 Packages 下的 plugin.js */
export async function loadPlugins(): Promise<void> {
  try {
    const resources = await api.scanPackageResources(['plugin.js'])
    for (const res of resources) {
      const r = await api.readFile(res.path)
      executePlugin(res.packageName, r.content)
    }
  } catch (err) {
    console.warn('[plugins] 扫描失败', err)
  }
}

/** 派发插件事件 */
export function emitPluginEvent(event: PluginEvent, payload: unknown): void {
  for (const h of listeners.get(event) ?? []) {
    try {
      h(payload)
    } catch (err) {
      console.error(`[plugins] 事件 ${event} 处理失败`, err)
    }
  }
}