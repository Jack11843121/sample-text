import * as monaco from 'monaco-editor'

export interface SnippetDef {
  name: string
  tabTrigger: string
  content: string
  scope: string
  description: string
}

export interface CompletionDef {
  trigger: string
  contents: string
  scope: string
  detail?: string
}

const snippets: SnippetDef[] = []
const completions: CompletionDef[] = []

/** 解析 .sublime-snippet (XML) */
export function parseSnippetXml(xml: string): SnippetDef | null {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const root = doc.documentElement
  if (!root || root.querySelector('parsererror')) return null
  const textOf = (sel: string): string => root.querySelector(sel)?.textContent ?? ''
  return {
    name: textOf('name'),
    tabTrigger: textOf('tabTrigger'),
    content: textOf('content'),
    scope: textOf('scope'),
    description: textOf('description')
  }
}

/** 解析 .sublime-completions (JSON) */
export function parseCompletionsJson(json: string): CompletionDef[] {
  try {
    const obj = JSON.parse(json) as { scope?: string; completions?: (string | { trigger?: string; contents?: string; annotation?: string })[] }
    const scope = obj.scope ?? ''
    const out: CompletionDef[] = []
    for (const c of obj.completions ?? []) {
      if (typeof c === 'string') {
        const idx = c.indexOf('\t')
        const trigger = idx >= 0 ? c.slice(0, idx) : c
        const contents = idx >= 0 ? c.slice(idx + 1) : c
        out.push({ trigger, contents, scope })
      } else if (c && typeof c.trigger === 'string') {
        out.push({ trigger: c.trigger, contents: c.contents ?? c.trigger, scope, detail: c.annotation })
      }
    }
    return out
  } catch {
    return []
  }
}

function scopeMatches(scope: string, language: string): boolean {
  if (!scope) return true
  // scope 形如 "source.js" / "text.html"，与 language id 做宽松匹配
  const s = scope.toLowerCase()
  const l = language.toLowerCase()
  if (s.includes(l)) return true
  // 常见 scope → language 映射
  const map: Record<string, string> = {
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    py: 'python',
    python: 'python',
    css: 'css',
    scss: 'scss',
    html: 'html',
    json: 'json',
    yaml: 'yaml',
    md: 'markdown',
    markdown: 'markdown',
    shell: 'shell',
    sh: 'shell'
  }
  for (const [k, v] of Object.entries(map)) {
    if (s.includes(k) && v === l) return true
  }
  return false
}

function rebuildProviders(): void {
  monaco.languages.registerCompletionItemProvider('*', {
    triggerCharacters: ['\t'],
    provideCompletionItems(model, position) {
      const lang = model.getLanguageId()
      const word = model.getWordUntilPosition(position)
      const range: monaco.Range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      )
      const sugs: monaco.languages.CompletionItem[] = []
      for (const s of snippets) {
        if (!scopeMatches(s.scope, lang)) continue
        if (s.tabTrigger && s.content) {
          sugs.push({
            label: s.tabTrigger,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: s.description || s.name || 'Snippet',
            documentation: s.content,
            insertText: s.content,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          })
        }
      }
      for (const c of completions) {
        if (!scopeMatches(c.scope, lang)) continue
        sugs.push({
          label: c.trigger,
          kind: monaco.languages.CompletionItemKind.Text,
          detail: c.detail ?? 'Completion',
          insertText: c.contents,
          range
        })
      }
      return { suggestions: sugs }
    }
  })
}

/** 注册 snippet 定义并（重新）构建补全提供者 */
export function registerSnippets(defs: SnippetDef[]): void {
  snippets.push(...defs)
}

export function registerCompletions(defs: CompletionDef[]): void {
  completions.push(...defs)
}

let providersBuilt = false
export function finalizeProviders(): void {
  if (providersBuilt) return
  providersBuilt = true
  rebuildProviders()
}

export function getAllSnippets(): SnippetDef[] {
  return snippets
}

/** 在当前编辑器中插入 snippet（处理 $1/$0 字段与 Tab 跳转） */
export function insertSnippetText(content: string): void {
  const editor = getEditorRef()
  if (!editor) return
  const controller = editor.getContribution('snippetController2') as { insert: (value: string) => void } | null
  if (controller) {
    controller.insert(content)
  } else {
    // 兜底：按光标插入原始文本
    const sel = editor.getSelection()
    if (sel) {
      editor.executeEdits('snippet-insert', [{ range: sel, text: content }])
    }
  }
}

// 避免循环依赖：由外部注入对 focused editor 的访问器
let getEditorRef: () => monaco.editor.IStandaloneCodeEditor | null = () => null
export function bindEditorAccessor(fn: () => monaco.editor.IStandaloneCodeEditor | null): void {
  getEditorRef = fn
}