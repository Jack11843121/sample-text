import * as monaco from 'monaco-editor'
import { store } from '../store'

export interface ParsedScheme {
  name: string
  globalColors: Record<string, string>
  rules: { token: string; foreground?: string; background?: string; fontStyle?: string }[]
}

// scope 片段 → Monaco token 类型（按 specificity 从高到低）
const SCOPE_TOKEN: [string, string][] = [
  ['comment', 'comment'],
  ['string', 'string'],
  ['constant.numeric', 'number'],
  ['constant.language', 'number'],
  ['constant', 'number'],
  ['keyword', 'keyword'],
  ['storage', 'keyword'],
  ['support.function', 'identifier'],
  ['support.class', 'type.identifier'],
  ['support.type', 'type'],
  ['support', 'identifier'],
  ['entity.name.function', 'identifier'],
  ['entity.name.class', 'type.identifier'],
  ['entity.name.type', 'type.identifier'],
  ['entity.name.tag', 'tag'],
  ['entity', 'identifier'],
  ['variable', 'variable'],
  ['function', 'identifier'],
  ['type', 'type.identifier'],
  ['attribute.name', 'attribute.name'],
  ['attribute.value', 'attribute.value'],
  ['tag', 'tag'],
  ['punctuation', 'delimiter'],
  ['operator', 'operator'],
  ['meta.tag', 'tag'],
  ['invalid', 'identifier']
]

function scopeToToken(scope: string): string {
  const parts = scope.trim().toLowerCase().split(/[\s,]+/)[0].split('.')
  for (let len = parts.length; len >= 1; len--) {
    const candidate = parts.slice(0, len).join('.')
    for (const [key, token] of SCOPE_TOKEN) {
      if (key === candidate || key.startsWith(candidate) || candidate.startsWith(key)) {
        return token
      }
    }
  }
  return 'identifier'
}

function fontStyleOf(s: string | undefined): string | undefined {
  if (!s) return undefined
  const out: string[] = []
  if (/bold/i.test(s)) out.push('bold')
  if (/italic/i.test(s)) out.push('italic')
  if (/underline/i.test(s)) out.push('underline')
  return out.length ? out.join(' ') : undefined
}

export function parseSublimeColorScheme(json: string): ParsedScheme | null {
  try {
    const obj = JSON.parse(json) as {
      name?: string
      globals?: Record<string, string>
      rules?: { scope?: string; foreground?: string; background?: string; font_style?: string }[]
    }
    if (!obj.rules && !obj.globals) return null
    return {
      name: obj.name ?? 'Untitled Scheme',
      globalColors: obj.globals ?? {},
      rules: (obj.rules ?? [])
        .filter((r) => r.scope)
        .map((r) => ({
          token: scopeToToken(r.scope!),
          foreground: r.foreground,
          background: r.background,
          fontStyle: fontStyleOf(r.font_style)
        }))
    }
  } catch {
    return null
  }
}

/** 解析 TextMate .tmTheme (plist XML) */
export function parseTmTheme(xml: string): ParsedScheme | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) return null
  const plist = doc.documentElement
  const dicts = Array.from(plist.getElementsByTagName('dict'))
  const get = (dict: Element, key: string): string | undefined => {
    const keys = dict.getElementsByTagName('key')
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].textContent === key) {
        const next = keys[i].nextElementSibling
        return next?.textContent ?? undefined
      }
    }
    return undefined
  }
  let name = 'Untitled Theme'
  const globalColors: Record<string, string> = {}
  const rules: ParsedScheme['rules'] = []
  for (const dict of dicts) {
    const scope = get(dict, 'scope')
    const nameV = get(dict, 'name')
    if (scope && nameV) {
      rules.push({
        token: scopeToToken(scope),
        foreground: get(dict, 'foreground'),
        background: get(dict, 'background'),
        fontStyle: fontStyleOf(get(dict, 'fontStyle'))
      })
    }
    if (!scope && nameV) {
      const fg = get(dict, 'foreground')
      const bg = get(dict, 'background')
      const caret = get(dict, 'caret')
      const selection = get(dict, 'selection')
      const lineHighlight = get(dict, 'lineHighlight')
      name = nameV
      if (bg) globalColors.background = bg
      if (fg) globalColors.foreground = fg
      if (caret) globalColors.caret = caret
      if (selection) globalColors.selection = selection
      if (lineHighlight) globalColors.lineHighlight = lineHighlight
    }
  }
  if (rules.length === 0 && Object.keys(globalColors).length === 0) return null
  return { name, globalColors, rules }
}

function colorToMonaco(hex: string | undefined): string | undefined {
  if (!hex) return undefined
  const h = hex.replace('#', '')
  if (h.length === 6) return `#${h}`.toUpperCase()
  if (h.length === 8) return `#${h}`.toUpperCase() // AARRGGBB → 简单忽略 alpha 高位示意
  return undefined
}

/** Monaco 主题名仅允许 [a-z0-9-]，此处归一化用户提供的主题名 */
export function sanitizeThemeName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'custom-theme'
}

/** 将解析结果注册为 Monaco 主题 */
export function registerScheme(scheme: ParsedScheme): void {
  const themeName = sanitizeThemeName(scheme.name)
  const g = scheme.globalColors
  const base = colorToMonaco(g.background)
  const isDark = base ? isDarkColor(base) : true
  monaco.editor.defineTheme(themeName, {
    base: isDark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: scheme.rules.map((r) => ({
      token: r.token,
      foreground: colorToMonaco(r.foreground),
      background: colorToMonaco(r.background),
      fontStyle: r.fontStyle
    })),
    colors: {
      'editor.background': base ?? '#1e1e1e',
      'editor.foreground': colorToMonaco(g.foreground) ?? '#bbbbbb',
      'editorCursor.foreground': colorToMonaco(g.caret) ?? '#ffffff',
      'editor.selectionBackground': colorToMonaco(g.selection) ?? '#3a3d41',
      'editor.lineHighlightBackground': colorToMonaco(g.lineHighlight) ?? '#2a2d2e',
      'editor.selectionHighlightBackground': colorToMonaco(g.selection) ?? '#3a3d4166'
    }
  })
}

function isDarkColor(hex: string): boolean {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const gg = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + gg * 587 + b * 114) / 1000 < 128
}

export function applyScheme(name: string): void {
  store.setActiveColorScheme(name)
  monaco.editor.setTheme(name)
  const scheme = schemeList.find((s) => s.name === name)
  document.documentElement.dataset.theme = scheme?.isDark !== false ? 'dark' : 'light'
}

let schemeList: { name: string; isDark?: boolean }[] = []
export function listSchemes(): { name: string; isDark?: boolean }[] {
  return schemeList
}

export function addSchemeEntry(name: string, isDark?: boolean): void {
  const n = sanitizeThemeName(name)
  if (!schemeList.some((s) => s.name === n)) schemeList.push({ name: n, isDark })
}