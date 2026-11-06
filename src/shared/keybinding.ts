/**
 * 键位解析与 context 条件引擎。
 * 兼容 Sublime 的 .sublime-keymap 语法子集：
 *   keys: ["ctrl+shift+p", "primary+d", "ctrl+k","ctrl+b" ...]
 * 修饰键映射：primary = (mac ? cmd : ctrl)，super/command = cmd(meta)。
 */
import type { KeyChord, KeyBindingRule, ContextRule, Platform, SettingsDict } from './types'
import { getSetting } from './settings'

const SUPER_KEYS = ['super', 'command', 'cmd', 'win', 'windows', 'meta']

const SPECIAL_KEYS: Record<string, string> = {
  backspace: 'Backspace',
  del: 'Delete',
  delete: 'Delete',
  enter: 'Enter',
  return: 'Enter',
  tab: 'Tab',
  space: ' ',
  esc: 'Escape',
  escape: 'Escape',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  insert: 'Insert',
  contextmenu: 'ContextMenu',
  context_menu: 'ContextMenu',
  pause: 'Pause',
  printscreen: 'PrintScreen',
  numlock: 'NumLock',
  scrolllock: 'ScrollLock'
}

function mapKeyName(name: string): string {
  const n = name.toLowerCase()
  if (SPECIAL_KEYS[n]) return SPECIAL_KEYS[n]
  // f1-f24
  if (/^f\d{1,2}$/.test(n)) return 'F' + n.slice(1)
  // 单个字母/数字
  if (/^[a-z0-9]$/.test(n)) return n
  // 常见符号
  if (['=', '-', '[', ']', '\\', '/', '\'', ';', '.', ',', '`', '~', '+'].includes(n)) return n
  return name
}

function isModifier(token: string): boolean {
  const t = token.toLowerCase()
  return [
    'ctrl',
    'control',
    'alt',
    'option',
    'shift',
    'super',
    'command',
    'cmd',
    'windows',
    'win',
    'primary'
  ].includes(t)
}

/** 解析单个和弦（如 "primary+shift+d"） */
export function parseChord(chord: string, platform: Platform): KeyChord {
  const tokens = chord.split('+').map((t) => t.trim()).filter(Boolean)
  const out: KeyChord = { key: '', ctrl: false, alt: false, shift: false, meta: false }
  for (const token of tokens) {
    const t = token.toLowerCase()
    if (t === 'primary') {
      if (platform === 'darwin') out.meta = true
      else out.ctrl = true
    } else if (SUPER_KEYS.includes(t)) {
      out.meta = true
    } else if (t === 'ctrl' || t === 'control') {
      out.ctrl = true
    } else if (t === 'alt' || t === 'option') {
      out.alt = true
    } else if (t === 'shift') {
      out.shift = true
    } else {
      out.key = mapKeyName(token)
    }
  }
  return out
}

export function parseKeys(keys: string[], platform: Platform): KeyChord[] {
  return keys.map((k) => parseChord(k, platform))
}

/** 无歧义的弦标识，用于哈希与排序 */
export function chordId(chord: KeyChord): string {
  return `${chord.ctrl ? 'C' : ''}${chord.alt ? 'A' : ''}${chord.shift ? 'S' : ''}${chord.meta ? 'M' : ''}+${chord.key}`
}

export function keyChordOfKeyboardEvent(e: {
  key: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}, platform: Platform): KeyChord {
  // 忽略纯修饰键
  const modOnly = ['Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'Fn']
  if (modOnly.includes(e.key) && e.key.length > 1) {
    return { key: '', ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey }
  }
  let key = e.key
  if (e.key.length === 1) key = e.key.toLowerCase()
  return { key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey }
}

export function chordMatches(a: KeyChord, b: KeyChord): boolean {
  return (
    a.key === b.key &&
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift &&
    a.meta === b.meta
  )
}

/** 从 KeyboardEvent 生成 DOM 键名映射（renderer 用） */
export function chordsEqual(a: KeyChord, keyboard: KeyChord): boolean {
  return chordMatches(a, keyboard)
}

// ---------------------------------------------------------------------------
// Context 条件引擎
// ---------------------------------------------------------------------------

export interface KeybindContextState {
  numSelections: number
  hasSelection: boolean
  selectionIsEmpty: boolean
  panel: string | null
  isReadOnly: boolean
  scopeName: string
  settings: SettingsDict
}

type Operator =
  | 'equal'
  | 'not_equal'
  | 'regex_contains'
  | 'not_regex_contains'
  | 'regex_match'
  | 'not_regex_match'

function resolveContextKey(key: string, state: KeybindContextState): unknown {
  switch (key) {
    case 'num_selections':
    case 'selection_count':
      return state.numSelections
    case 'has_selection':
      return state.hasSelection
    case 'selection_empty':
      return state.selectionIsEmpty
    case 'panel':
      return state.panel ?? ''
    case 'panel_visible':
      return !!state.panel
    case 'read_only':
    case 'is_read_only':
      return state.isReadOnly
    case 'selector':
      return state.scopeName
    default:
      if (key.startsWith('setting.')) {
        return getSetting(state.settings, key.slice('setting.'.length))
      }
      return undefined
  }
}

function evalSingle(rule: ContextRule, state: KeybindContextState): boolean {
  const value = resolveContextKey(rule.key, state)
  const op: Operator = rule.operator ?? 'equal'
  const operand = rule.operand

  switch (op) {
    case 'equal': {
      // boolean 语境 / 有值即真
      if (operand === undefined) return !!value
      if (typeof value === 'boolean' || typeof operand === 'boolean') return !!value === !!operand
      return String(value) === String(operand)
    }
    case 'not_equal': {
      if (operand === undefined) return !value
      if (typeof value === 'boolean' || typeof operand === 'boolean') return !!value !== !!operand
      return String(value) !== String(operand)
    }
    case 'regex_contains': {
      if (value === undefined || operand === undefined) return false
      try {
        return new RegExp(String(operand)).test(String(value))
      } catch {
        return false
      }
    }
    case 'not_regex_contains': {
      if (value === undefined || operand === undefined) return true
      try {
        return !new RegExp(String(operand)).test(String(value))
      } catch {
        return true
      }
    }
    case 'regex_match': {
      if (value === undefined || operand === undefined) return false
      try {
        const m = new RegExp(String(operand)).exec(String(value))
        return !!m && m[0] === String(value)
      } catch {
        return false
      }
    }
    case 'not_regex_match': {
      if (value === undefined || operand === undefined) return true
      try {
        const m = new RegExp(String(operand)).exec(String(value))
        return !(m && m[0] === String(value))
      } catch {
        return true
      }
    }
    default:
      return false
  }
}

export function evalContext(rules: ContextRule[] | undefined, state: KeybindContextState): boolean {
  if (!rules || rules.length === 0) return true
  const matchAll = rules[0].match_all ?? true
  if (matchAll) return rules.every((r) => evalSingle(r, state))
  return rules.some((r) => evalSingle(r, state))
}

/** 校验键位规则是否语义合法（key 非空等） */
export function validateKeyBinding(rule: KeyBindingRule): boolean {
  return Array.isArray(rule.keys) && rule.keys.length > 0 && typeof rule.command === 'string'
}