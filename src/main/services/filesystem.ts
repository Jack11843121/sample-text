import { promises as fs } from 'fs'
import { join, basename } from 'path'
import { watch as chokidarWatch, type FSWatcher } from 'chokidar'
import type {
  Eol,
  Encoding,
  NodeKind,
  ReadFileResult,
  StatInfo,
  TreeNode,
  GitStatusChar
} from '@shared/types'

export interface FsChangeEvent {
  event: 'add' | 'addDir' | 'unlink' | 'unlinkDir' | 'change'
  path: string
}

const DEFAULT_IGNORED = (function (): RegExp[] {
  const names = ['node_modules', '.git', '.svn', '.hg', '__pycache__', '.DS_Store', 'dist', 'build', '.idea', '.vscode']
  return names.map((n) => new RegExp(`(^|[/\\\\])${n}($|[/\\\\])`))
})()

function isIgnored(path: string): boolean {
  return DEFAULT_IGNORED.some((re) => re.test(path))
}

function detectEncoding(buf: Buffer): { encoding: Encoding; text: string } {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { encoding: 'utf8bom', text: buf.toString('utf8') }
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return { encoding: 'utf16le', text: buf.toString('utf16le') }
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    // UTF-16 BE：罕见，转 LE 后解码
    const swapped = Buffer.from(buf)
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const t = swapped[i]
      swapped[i] = swapped[i + 1]
      swapped[i + 1] = t
    }
    return { encoding: 'utf16le', text: swapped.toString('utf16le') }
  }
  return { encoding: 'utf8', text: buf.toString('utf8') }
}

function detectEol(text: string): Eol {
  const i = text.indexOf('\n')
  if (i >= 0 && i > 0 && text[i - 1] === '\r') return 'CRLF'
  if (text.includes('\r')) return 'CR'
  return 'LF'
}

export async function readFile(path: string): Promise<ReadFileResult> {
  const buf = await fs.readFile(path)
  const { encoding, text } = detectEncoding(buf)
  const stat = await fs.stat(path)
  return {
    path,
    content: text,
    encoding,
    eol: detectEol(text),
    mtime: stat.mtimeMs,
    size: stat.size
  }
}

export async function writeFile(path: string, content: string, opts: { encoding?: Encoding; eol?: Eol } = {}): Promise<void> {
  let text = content
  const eol = opts.eol ?? 'LF'
  const nl = eol === 'CRLF' ? '\r\n' : eol === 'CR' ? '\r' : '\n'
  if (nl !== '\n') {
    text = text.replace(/\r\n|\r|\n/g, nl)
  }
  let buf: Buffer
  const encoding = opts.encoding ?? 'utf8'
  if (encoding === 'utf8bom') buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')])
  else if (encoding === 'utf16le') buf = Buffer.from('\ufeff' + text, 'utf16le')
  else buf = Buffer.from(text, 'utf8')
  await fs.writeFile(path, buf)
}

export async function existsOk(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

/** 删除文件或目录（递归；force=true 忽略不存在） */
export async function deletePath(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true })
}

/** 递归列出目录下所有文件（用于 Goto Anything / Find in Files），跳过忽略项 */
export async function listFiles(root: string): Promise<string[]> {
  const out: string[] = []
  async function walk(dir: string): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      const full = join(dir, ent.name)
      if (isIgnored(full)) continue
      if (ent.isSymbolicLink()) {
        try {
          const st = await fs.stat(full)
          if (st.isDirectory()) await walk(full)
        } catch {
          /* 忽略断裂链接 */
        }
        continue
      }
      if (ent.isDirectory()) await walk(full)
      else out.push(full)
    }
  }
  await walk(root)
  return out
}

export async function statInfo(path: string): Promise<StatInfo> {
  try {
    const st = await fs.stat(path)
    return {
      path,
      exists: true,
      isDirectory: st.isDirectory(),
      isFile: st.isFile(),
      size: st.size,
      mtime: st.mtimeMs
    }
  } catch {
    return { path, exists: false, isDirectory: false, isFile: false, size: 0, mtime: 0 }
  }
}

async function kindOf(path: string): Promise<NodeKind> {
  const st = await fs.lstat(path)
  if (st.isSymbolicLink()) {
    const target = await fs.stat(path).catch(() => null)
    return target?.isDirectory() ? 'symlink-directory' : 'symlink-file'
  }
  if (st.isDirectory()) return 'directory'
  return 'file'
}

async function symlinkTarget(path: string): Promise<string | undefined> {
  try {
    return await fs.readlink(path)
  } catch {
    return undefined
  }
}

export async function readDir(path: string, gitStatus?: Record<string, GitStatusChar>): Promise<TreeNode[]> {
  const entries = await fs.readdir(path, { withFileTypes: true })
  const nodes: TreeNode[] = []
  for (const ent of entries) {
    const full = join(path, ent.name)
    if (isIgnored(full)) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue
    }
    const kind = await kindOf(full).catch(() => 'file' as NodeKind)
    const isDir = kind === 'directory' || kind === 'symlink-directory'
    nodes.push({
      name: ent.name,
      path: full,
      kind,
      isDirectory: isDir,
      symlinkTarget: kind.startsWith('symlink') ? await symlinkTarget(full) : undefined,
      gitStatus: gitStatus?.[full],
      ignored: false
    })
  }
  nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return nodes
}

export async function tree(root: string, maxDepth = 8): Promise<TreeNode> {
  const st = await fs.lstat(root)
  const kind: NodeKind = st.isDirectory() ? 'directory' : 'file'
  const isDir = kind === 'directory'
  const node: TreeNode = {
    name: basename(root),
    path: root,
    kind,
    isDirectory: isDir,
    ignored: false
  }
  if (isDir && maxDepth > 0) {
    node.children = await readDir(root)
    for (let i = 0; i < node.children.length; i++) {
      const c = node.children[i]
      if (c.isDirectory && !isIgnored(c.path) && maxDepth > 1) {
        c.children = (await tree(c.path, maxDepth - 1)).children
      }
    }
  }
  return node
}

export function watchPaths(paths: string[], onEvent: (ev: FsChangeEvent) => void): FSWatcher {
  const watcher = chokidarWatch(paths, {
    ignoreInitial: true,
    ignored: (p) => isIgnored(p),
    depth: 20,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
  })
  watcher.on('all', (event, path) => {
    onEvent({ event: event as FsChangeEvent['event'], path })
  })
  return watcher
}

export { isIgnored }