import type * as monaco from 'monaco-editor'
import { languageForPath } from './editor/languages'

export interface SymbolItem {
  name: string
  detail: string
  line: number
  kind: string
}

const JS_RE = /^\s*(export\s+(default\s+)?)?(async\s+)?(function\s*\*?\s*|class\s+|interface\s+|type\s+|enum\s+|const\s+|let\s+|var\s+)([A-Za-z_$][\w$]*)/
const METHOD_RE = /^\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/
const PY_RE = /^\s*(async\s+)?(def|class)\s+([A-Za-z_]\w*)/
const SKIP_WORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'with', 'return', 'throw', 'try', 'else'])

/** 从文本行中启发式提取符号（无需 Monaco 模型，供项目索引复用） */
export function extractSymbolsFromLines(lines: string[], language: string): SymbolItem[] {
  const out: SymbolItem[] = []
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]
    const line = i + 1
    if (language === 'python') {
      const m = PY_RE.exec(text)
      if (m) out.push({ name: m[3], detail: m[2] === 'class' ? 'class' : 'def', line, kind: m[2] })
      continue
    }
    if (language === 'javascript' || language === 'typescript') {
      const m = JS_RE.exec(text)
      if (m) {
        out.push({ name: m[5], detail: m[4].trim(), line, kind: m[4].trim() })
        continue
      }
      if (text.includes('(') && !text.trim().startsWith('//') && !text.trim().startsWith('*')) {
        const mm = METHOD_RE.exec(text)
        if (mm && !SKIP_WORDS.has(mm[1])) {
          out.push({ name: mm[1], detail: 'function', line, kind: 'function' })
        }
      }
      continue
    }
    if (language === 'markdown' || language === 'plaintext') {
      const heading = /^(#{1,6})\s+(.+)$/.exec(text)
      if (heading) out.push({ name: heading[2].trim(), detail: 'heading', line, kind: 'heading' })
      continue
    }
    // 通用回退：缩进为 0 的声明型行
    if (/^\S/.test(text) && !/^\s*(\/\/|#|\*|\/\*|\*\/)/.test(text)) {
      const word = text.trim().split(/\s+/)[0].replace(/[:(].*$/, '')
      if (word && word.length >= 2 && word.length <= 40) {
        out.push({ name: word, detail: text.trim().slice(0, 60), line, kind: 'decl' })
      }
    }
  }
  return out
}

export function extractSymbols(model: monaco.editor.ITextModel): SymbolItem[] {
  const lines: string[] = []
  const total = model.getLineCount()
  for (let i = 1; i <= total; i++) lines.push(model.getLineContent(i))
  return extractSymbolsFromLines(lines, model.getLanguageId())
}