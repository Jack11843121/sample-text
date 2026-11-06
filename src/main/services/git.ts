import { execFile } from 'child_process'
import { promisify } from 'util'
import type { GitState, GitStatusChar } from '@shared/types'

const execFileAsync = promisify(execFile)

function run(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolvePromise) => {
    execFile('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolvePromise({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        code: err ? ((err as { code?: number }).code ?? 1) : 0
      })
    })
  })
}

function statusChar(x: string, y: string): GitStatusChar {
  if (x === '?' && y === '?') return '?'
  if (x === 'U' || y === 'U' || x === 'A' && y === 'A' || x === 'D' && y === 'D') return 'U'
  const code = y !== ' ' ? y : x
  switch (code) {
    case 'M': return 'M'
    case 'A': return 'A'
    case 'D': return 'D'
    case 'R': return 'R'
    case 'C': return 'C'
    case 'U': return 'U'
    default: return '!'
  }
}

export async function gitStatus(folderPath: string): Promise<GitState> {
  const check = await run(['rev-parse', '--is-inside-work-tree'], folderPath)
  if (check.code !== 0) {
    return { isRepo: false, status: {}, staged: 0, unstaged: 0, untracked: 0 }
  }

  let branch: string | undefined
  const branchRes = await run(['rev-parse', '--abbrev-ref', 'HEAD'], folderPath)
  if (branchRes.code === 0 && branchRes.stdout.trim() && branchRes.stdout.trim() !== 'HEAD') {
    branch = branchRes.stdout.trim()
  }

  const status: Record<string, GitStatusChar> = {}
  let staged = 0
  let unstaged = 0
  let untracked = 0

  const st = await run(['status', '--porcelain', '-z', '--untracked-files=all'], folderPath)
  if (st.code === 0 && st.stdout) {
    const entries = st.stdout.split('\0').filter(Boolean)
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry.length < 4) continue
      const x = entry[0]
      const y = entry[1]
      let path = entry.slice(3)
      // 重命名：下一项为原路径；取新路径即可
      if (x === 'R' || y === 'R') {
        // entry.slice(3) 是新路径；旧路径在下一个 NUL 段（若存在）
      }
      status[path] = statusChar(x, y)
      if (x === '?' && y === '?') untracked++
      else if (x !== ' ') staged++
      if (y !== ' ' && y !== '?') unstaged++
    }
  }

  return { isRepo: true, branch, status, staged, unstaged, untracked }
}

export interface LineDiff {
  added: number[]
  modified: number[]
  /** 删除发生处（用新侧行号作为锚点，用于 gutter 红标记） */
  deleted: number[]
}

/** 解析某文件相对 HEAD/暂存区的工作区行级改动 */
export async function gitDiffLines(folderPath: string, file: string): Promise<LineDiff> {
  const result: LineDiff = { added: [], modified: [], deleted: [] }
  const check = await run(['rev-parse', '--is-inside-work-tree'], folderPath)
  if (check.code !== 0) return result

  const out = await run(['diff', '--unified=0', '--', file], folderPath)
  const staged = await run(['diff', '--cached', '--unified=0', '--', file], folderPath)
  const body = (staged.stdout || '') + (out.stdout || '')
  if (!body) return result

  for (const line of body.split('\n')) {
    const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line)
    if (!m) continue
    const oldStart = parseInt(m[1], 10)
    const oldCount = m[2] ? parseInt(m[2], 10) : 1
    const newStart = parseInt(m[3], 10)
    const newCount = m[4] ? parseInt(m[4], 10) : 1
    if (oldCount === 0) {
      // 纯新增
      for (let i = 0; i < newCount; i++) result.added.push(newStart + i)
    } else if (newCount === 0) {
      // 纯删除
      result.deleted.push(newStart)
    } else {
      // 修改（新增侧标黄，删除侧红）
      for (let i = 0; i < newCount; i++) result.modified.push(newStart + i)
      result.deleted.push(newStart)
    }
  }
  return result
}