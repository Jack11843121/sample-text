import * as monaco from 'monaco-editor'
import { loadWASM, createOnigScanner, createOnigString } from 'vscode-oniguruma'
import {
  Registry,
  parseRawGrammar,
  INITIAL,
  type IGrammar,
  type StateStack
} from 'vscode-textmate'
import { languageForExtension } from './languages'
import onigWasmUrl from 'vscode-oniguruma/release/onig.wasm?url'

/**
 * TextMate (.tmLanguage) 语法引擎。
 * 通过 vscode-textmate + vscode-oniguruma，把 TextMate 语法注册为 Monaco 的 token provider，
 * 使 scope 体系（配合 .tmTheme/.sublime-color-scheme 配色）得到精确着色。
 * 默认不启用（Monaco Monarch 已覆盖主流语言）；当 Packages 中存在匹配的 .tmLanguage 时激活。
 */

class TmState implements monaco.languages.IState {
  constructor(public readonly ruleStack: StateStack) {}
  clone(): TmState {
    return new TmState(this.ruleStack)
  }
  equals(other: monaco.languages.IState): boolean {
    return other instanceof TmState && other.ruleStack === this.ruleStack
  }
}

const grammars = new Map<string, string>() // scopeName -> JSON 内容
const scopeByLanguage = new Map<string, string>() // monaco language id -> scopeName

let registry: Registry | null = null
let initPromise: Promise<void> | null = null

function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const res = await fetch(onigWasmUrl)
      await loadWASM(await res.arrayBuffer())
      registry = new Registry({
        onigLib: Promise.resolve({ createOnigScanner, createOnigString }),
        loadGrammar: async (scope) => {
          const content = grammars.get(scope)
          return content ? parseRawGrammar(content) : null
        }
      })
    })().catch((err) => {
      console.warn('[textmate] 初始化失败', err)
      initPromise = null
    })
  }
  return initPromise
}

async function ensureGrammar(scope: string): Promise<IGrammar | null> {
  await ensureInit()
  if (!registry) return null
  return registry.loadGrammar(scope)
}

/** 语法就绪后安装同步 token provider（Monaco 的 tokenize 是同步的） */
async function installProvider(language: string, scope: string): Promise<void> {
  const grammar = await ensureGrammar(scope)
  if (!grammar) return
  monaco.languages.setTokensProvider(language, {
    getInitialState: (): TmState => new TmState(INITIAL),
    tokenize: (line: string, state: TmState) => {
      const r = grammar.tokenizeLine(line, state.ruleStack)
      return {
        tokens: r.tokens.map((t) => ({ startIndex: t.startIndex, scopes: t.scopes.join(' ') })),
        endState: new TmState(r.ruleStack)
      }
    }
  })
}

/** 注册一个 TextMate 语法（JSON 格式），并绑定到 fileTypes 对应语言 */
export function registerTextMateGrammar(fileTypes: string[], scopeName: string, content: string): void {
  if (!scopeName || !content) return
  grammars.set(scopeName, content)
  const bound: string[] = []
  for (const ft of fileTypes ?? []) {
    const lang = languageForExtension(ft)
    if (lang && lang !== 'plaintext') {
      scopeByLanguage.set(lang, scopeName)
      if (!bound.includes(lang)) bound.push(lang)
    }
  }
  // 至少按 scopeName 的末段猜一个语言（如 source.python -> python）
  if (bound.length === 0) {
    const guess = scopeName.split('.').pop()?.toLowerCase()
    if (guess) {
      const lang = languageForExtension(guess)
      if (lang && lang !== 'plaintext') {
        scopeByLanguage.set(lang, scopeName)
        bound.push(lang)
      }
    }
  }
  for (const lang of bound) {
    void installProvider(lang, scopeName)
  }
}

export function hasTextMateGrammar(): boolean {
  return grammars.size > 0
}

/** 预初始化（首次加载到语法前调用，确保 wasm 就绪） */
export function warmTextMate(): void {
  void ensureInit()
}