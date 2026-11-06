import { promises as fs } from 'fs'
import { listFiles } from './filesystem'
import type { SearchHit, SearchOptions } from '@shared/types'

export async function findInFiles(folders: string[], opts: SearchOptions): Promise<SearchHit[]> {
  const hits: SearchHit[] = []
  let pattern: RegExp | null = null
  if (opts.regex) {
    try {
      pattern = new RegExp(opts.query, opts.caseSensitive ? 'g' : 'gi')
    } catch {
      return hits
    }
  } else {
    const escaped = opts.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const q = opts.wholeWord ? `\\b${escaped}\\b` : escaped
    pattern = new RegExp(q, opts.caseSensitive ? 'g' : 'gi')
  }

  for (const folder of folders) {
    const files = await listFiles(folder)
    for (const file of files) {
      if (opts.include && !file.endsWith(opts.include)) continue
      let content: string
      try {
        content = await fs.readFile(file, 'utf8')
      } catch {
        continue
      }
      const lines = content.split(/\r?\n/)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        let m: RegExpExecArray | null
        pattern.lastIndex = 0
        while ((m = pattern.exec(line)) !== null) {
          hits.push({
            path: file,
            line: i + 1,
            column: (m.index ?? 0) + 1,
            text: line.trim()
          })
          if (m[0].length === 0) pattern.lastIndex++
          if (hits.length > 5000) return hits
        }
      }
    }
  }
  return hits
}