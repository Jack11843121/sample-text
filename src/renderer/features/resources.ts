import {
  parseCompletionsJson,
  parseSnippetXml,
  registerCompletions,
  registerSnippets,
  finalizeProviders,
  bindEditorAccessor
} from './completions'
import { parseSublimeColorScheme, parseTmTheme, registerScheme, addSchemeEntry } from './themes'
import { registerTextMateGrammar, warmTextMate } from '../editor/textmate'
import { getFocusedEditor } from '../editor/session'

const api = window.sampleText

/** 启动时扫描 Packages 目录，加载 snippet/completions/配色方案/TextMate 语法 */
export async function loadPackageResources(): Promise<void> {
  bindEditorAccessor(() => getFocusedEditor())
  addSchemeEntry('sample-text Dark', true)
  addSchemeEntry('sample-text Light', false)
  warmTextMate()
  try {
    const resources = await api.scanPackageResources([
      '.sublime-snippet',
      '.sublime-completions',
      '.sublime-color-scheme',
      '.tmTheme',
      '.tmLanguage'
    ])
    const tmFiles: string[] = []
    for (const res of resources) {
      const raw = await api.readFile(res.path)
      if (res.type === '.sublime-snippet') {
        const s = parseSnippetXml(raw.content)
        if (s && s.content) registerSnippets([s])
      } else if (res.type === '.sublime-completions') {
        registerCompletions(parseCompletionsJson(raw.content))
      } else if (res.type === '.sublime-color-scheme') {
        const scheme = parseSublimeColorScheme(raw.content)
        if (scheme) {
          registerScheme(scheme)
          addSchemeEntry(scheme.name, isDarkScheme(scheme))
        }
      } else if (res.type === '.tmTheme') {
        const scheme = parseTmTheme(raw.content)
        if (scheme) {
          registerScheme(scheme)
          addSchemeEntry(scheme.name, isDarkScheme(scheme))
        }
      } else if (res.type === '.tmLanguage') {
        tmFiles.push(raw.content)
      }
    }
    for (const content of tmFiles) {
      loadTextMateGrammar(content)
    }
  } catch (err) {
    console.warn('[resources] 加载包资源失败', err)
  }
  finalizeProviders()
}

/** 解析 .tmLanguage(JSON) 并注册到 TextMate 引擎 */
function loadTextMateGrammar(content: string): void {
  try {
    const obj = JSON.parse(content) as { scopeName?: string; fileTypes?: string[] }
    if (!obj.scopeName) return
    registerTextMateGrammar(obj.fileTypes ?? [], obj.scopeName, content)
  } catch {
    // plist 格式的 .tmLanguage 暂不支持
  }
}

function isDarkScheme(scheme: { globalColors: Record<string, string> }): boolean {
  const bg = scheme.globalColors.background ?? '#1e1e1e'
  const h = bg.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}