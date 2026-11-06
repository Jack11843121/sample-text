/**
 * Sublime 风格的分层设置合并。
 * 层序（越靠后优先级越高）：
 *   Default → Default(平台) → User → 项目 → 语法特异 → 缓冲区
 * 对象递归深合并；数组与原始值整体替换；值为 null 表示“删除该键”。
 */
import type { SettingsDict, Platform } from './types'

export function platformKey(platform: Platform): 'osx' | 'windows' | 'linux' {
  if (platform === 'darwin') return 'osx'
  if (platform === 'win32') return 'windows'
  return 'linux'
}

function isPlainObject(v: unknown): v is SettingsDict {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function mergePair(base: SettingsDict, overlay: SettingsDict): SettingsDict {
  const result: SettingsDict = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    if (value === null) {
      delete result[key]
    } else if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergePair(result[key] as SettingsDict, value)
    } else {
      result[key] = value
    }
  }
  return result
}

/** 从低优先级到高优先级依次传入，高优先级覆盖低优先级 */
export function mergeSettings(...layers: (SettingsDict | null | undefined)[]): SettingsDict {
  let result: SettingsDict = {}
  for (const layer of layers) {
    if (layer && isPlainObject(layer)) {
      result = mergePair(result, layer)
    }
  }
  return result
}

/** 深拷贝（用于隔离可变状态） */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => deepClone(v)) as unknown as T
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = deepClone(v)
  }
  return out as T
}

/** 按点路径读取，如 "font_size" 或 "ignored_packages" */
export function getSetting(settings: SettingsDict, key: string, fallback?: unknown): unknown {
  const parts = key.split('.')
  let cur: unknown = settings
  for (const part of parts) {
    if (isPlainObject(cur)) {
      cur = cur[part]
    } else {
      return fallback
    }
  }
  return cur === undefined ? fallback : cur
}