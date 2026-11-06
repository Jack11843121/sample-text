import { app } from 'electron'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import type { SettingsDict } from '@shared/types'

function userSettingsPath(): string {
  return join(app.getPath('userData'), 'sample-text', 'Preferences.sublime-settings')
}

function userKeymapPath(): string {
  return join(app.getPath('userData'), 'sample-text', 'Default.sublime-keymap')
}

export function getUserSettingsPath(): string {
  return userSettingsPath()
}

export function getUserKeymapPath(): string {
  return userKeymapPath()
}

export async function readUserSettings(): Promise<SettingsDict> {
  try {
    const raw = await fs.readFile(userSettingsPath(), 'utf8')
    // 允许注释与尾逗号，做宽松解析
    return JSON.parse(stripJsonComments(raw)) as SettingsDict
  } catch {
    return {}
  }
}

export async function writeUserSettings(settings: SettingsDict): Promise<void> {
  const p = userSettingsPath()
  await fs.mkdir(dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(settings, null, 4) + '\n', 'utf8')
}

export async function readUserKeymap(): Promise<string> {
  try {
    return await fs.readFile(userKeymapPath(), 'utf8')
  } catch {
    return '[\n\t// 在此添加自定义键位，例如：\n\t// { "keys": ["ctrl+shift+t"], "command": "reopen_last_file" },\n]\n'
  }
}

export async function writeUserKeymap(content: string): Promise<void> {
  const p = userKeymapPath()
  await fs.mkdir(dirname(p), { recursive: true })
  await fs.writeFile(p, content, 'utf8')
}

/** 移除 JSON 中的 // 与 行内注释和尾逗号（Sublime 设置文件惯例） */
export function stripJsonComments(src: string): string {
  let out = ''
  let inString = false
  let inLineComment = false
  let inBlockComment = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    const next = src[i + 1]
    if (inLineComment) {
      if (c === '\n') {
        inLineComment = false
        out += c
      }
      continue
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false
        i++
      }
      continue
    }
    if (inString) {
      out += c
      if (c === '\\' && next) {
        out += next
        i++
      } else if (c === '"') {
        inString = false
      }
      continue
    }
    if (c === '"') {
      inString = true
      out += c
    } else if (c === '/' && next === '/') {
      inLineComment = true
      i++
    } else if (c === '/' && next === '*') {
      inBlockComment = true
      i++
    } else {
      out += c
    }
  }
  // 去尾逗号
  return out.replace(/,\s*([}\]])/g, '$1')
}