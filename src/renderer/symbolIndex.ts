import { extractSymbolsFromLines, type SymbolItem } from './symbols'
import { languageForPath } from './editor/languages'
import { store } from './store'

const api = window.sampleText

export interface ProjectSymbol extends SymbolItem {
  file: string
}

const TEXT_EXT = /\.(js|mjs|cjs|jsx|ts|tsx|json|css|scss|less|html|md|py|java|c|cc|cpp|h|hpp|cs|go|rs|rb|php|sh|yml|yaml|xml|sql|swift|kt|vue|graphql|lua|r|scala|dart|ex|exs|clj|cljs|toml)$/i

let cache: ProjectSymbol[] | null = null
let cacheKey = ''

function keyOf(folders: string[]): string {
  return folders.join('|')
}

export async function buildProjectSymbolIndex(force = false): Promise<ProjectSymbol[]> {
  const f = store.getState().folderPaths
  if (f.length === 0) return []
  const k = keyOf(f)
  if (!force && cache && cacheKey === k) return cache

  const out: ProjectSymbol[] = []
  for (const folder of f) {
    let files: string[] = []
    try {
      files = await api.listFiles(folder)
    } catch {
      continue
    }
    for (const file of files) {
      if (!TEXT_EXT.test(file)) continue
      let r
      try {
        r = await api.readFile(file)
      } catch {
        continue
      }
      if (r.size > 400_000) continue
      const lines = r.content.split(/\r?\n/)
      const lang = languageForPath(file)
      for (const s of extractSymbolsFromLines(lines, lang)) {
        out.push({ ...s, file })
      }
    }
  }
  cache = out
  cacheKey = k
  return out
}

export async function searchProjectSymbols(query: string): Promise<ProjectSymbol[]> {
  const all = await buildProjectSymbolIndex()
  if (!query.trim()) return all.slice(0, 300)
  const q = query.toLowerCase()
  const scored = all
    .map((s) => {
      const name = s.name.toLowerCase()
      let score = 0
      if (name === q) score = 1000
      else if (name.startsWith(q)) score = 500 - name.length
      else if (name.includes(q)) score = 200 - name.length * 0.5
      return { s, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, 300).map((x) => x.s)
}