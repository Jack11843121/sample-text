import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import AdmZip from 'adm-zip'
import type { PackageMeta, PackagedResource, RemotePackage } from '@shared/types'

const execFileAsync = promisify(execFile)

/** 包根目录（松散目录 / .sublime-package） */
function packageRoots(): string[] {
  return [join(app.getPath('userData'), 'sample-text', 'Packages')]
}

export async function getPackageRoots(): Promise<string[]> {
  return packageRoots()
}

/** 扫描 Packages 下指定后缀的资源文件（松散目录，暂不展开 .sublime-package） */
export async function scanResources(kinds: string[]): Promise<PackagedResource[]> {
  const roots = packageRoots()
  const out: PackagedResource[] = []

  for (const root of roots) {
    await walk(root, '')

    async function walk(dir: string, pkgName: string): Promise<void> {
      let entries
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      // User 目录恒优先（最后覆盖）；其余按字母序
      entries.sort((a, b) => a.name.localeCompare(b.name))
      for (const ent of entries) {
        const full = join(dir, ent.name)
        if (ent.isDirectory() && !ent.name.startsWith('.')) {
          await walk(full, ent.name)
        } else if (ent.isFile()) {
          const kind = kinds.find((k) => ent.name.endsWith(k))
          if (kind) {
            out.push({ path: full, type: kind, packageName: pkgName || 'User' })
          }
        }
      }
    }
  }
  return out
}

/** 列出顶层包（用于包管理界面） */
export async function listPackages(): Promise<PackageMeta[]> {
  const roots = packageRoots()
  const out: PackageMeta[] = []
  for (const root of roots) {
    let entries
    try {
      entries = await fs.readdir(root, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of entries) {
      const full = join(root, ent.name)
      if (ent.isDirectory()) {
        out.push({
          name: ent.name,
          location: full,
          source: 'loose',
          builtin: false,
          order: ent.name === 'User' ? 999 : 0
        })
      } else if (ent.isFile() && ent.name.endsWith('.sublime-package')) {
        out.push({
          name: ent.name.replace(/\.sublime-package$/, ''),
          location: full,
          source: 'sublime-package',
          builtin: false,
          order: 0
        })
      }
    }
  }
  return out
}

/** 按覆盖顺序排序资源：非 User 字母序在前，User 最后（最终生效） */
export function sortResourcesByOverride(resources: PackagedResource[]): PackagedResource[] {
  return [...resources].sort((a, b) => {
    const au = a.packageName === 'User' ? 1 : 0
    const bu = b.packageName === 'User' ? 1 : 0
    if (au !== bu) return au - bu
    return a.path.localeCompare(b.path)
  })
}

// ---------------------------------------------------------------------------
// 包管理（Package Control 简化实现：channel/repository + git/zip 安装）
// ---------------------------------------------------------------------------

/**
 * 拉取并解析 channel / repository JSON，返回可安装包列表。
 * 兼容两种 schema：
 *   - channel：{ "repositories": ["<url>", ...] }
 *   - repository：{ "packages": [{ "name", "description", "releases": [{ "version", "url" }] }] }
 * 也兼容扁平数组：[{ "name", "description", "source" }]
 */
export async function fetchChannel(url: string): Promise<RemotePackage[]> {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`拉取失败 HTTP ${res.status}`)
  const data = (await res.json()) as unknown

  const out: RemotePackage[] = []
  const collectPackages = (pkgArr: unknown[]): void => {
    for (const p of pkgArr) {
      const pk = p as {
        name?: string
        description?: string
        releases?: { version?: string; url?: string }[]
        source?: string
        repo?: string
      }
      if (!pk.name) continue
      const release = pk.releases?.[0]
      const source = pk.source ?? release?.url ?? pk.repo ?? ''
      if (!source) continue
      out.push({
        name: pk.name,
        description: pk.description,
        version: release?.version,
        source
      })
    }
  }

  if (Array.isArray(data)) {
    collectPackages(data)
  } else if (data && typeof data === 'object') {
    const obj = data as { repositories?: string[]; packages?: unknown[] }
    if (Array.isArray(obj.packages)) {
      collectPackages(obj.packages)
    }
    if (Array.isArray(obj.repositories)) {
      for (const repoUrl of obj.repositories) {
        try {
          const r = await fetch(repoUrl, { redirect: 'follow' })
          const rd = (await r.json()) as { packages?: unknown[] }
          if (Array.isArray(rd?.packages)) collectPackages(rd.packages)
        } catch {
          // 忽略单个 repository 失败
        }
      }
    }
  }
  return out
}

function packageDir(name: string): string {
  return join(packageRoots()[0], name)
}

function isGitUrl(source: string): boolean {
  return /(\.git$)|(^git@)|(github\.com|gitlab\.com|bitbucket\.org)/i.test(source)
}

export async function installPackage(name: string, source: string): Promise<void> {
  const dest = packageDir(name)
  await fs.rm(dest, { recursive: true, force: true })
  await fs.mkdir(dest, { recursive: true })

  if (isGitUrl(source)) {
    await execFileAsync('git', ['clone', '--depth', '1', source, dest], { maxBuffer: 64 * 1024 * 1024 })
    return
  }
  // zip / 归档下载
  const res = await fetch(source, { redirect: 'follow' })
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const tmp = join(tmpdir(), `sample-text-${Date.now()}.zip`)
  await fs.writeFile(tmp, buf)
  const zip = new AdmZip(tmp)
  // 若 zip 内含单一顶层目录，则平铺其内容
  const entries = zip.getEntries()
  const prefix =
    entries.length > 0 ? entries[0].entryName.split('/')[0] + '/' : ''
  const hasSingleRoot = entries.length > 0 && entries.every((e) => e.entryName.startsWith(prefix))
  if (hasSingleRoot) {
    zip.extractAllTo(dest, true)
    const inner = join(dest, entries[0].entryName.split('/')[0])
    for (const e of await fs.readdir(inner, { withFileTypes: true })) {
      await fs.rename(join(inner, e.name), join(dest, e.name))
    }
    await fs.rm(inner, { recursive: true, force: true })
  } else {
    zip.extractAllTo(dest, true)
  }
  await fs.rm(tmp, { force: true })
}

export async function removePackage(name: string): Promise<void> {
  await fs.rm(packageDir(name), { recursive: true, force: true })
}