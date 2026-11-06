import { promises as fs } from 'fs'
import { join, dirname, basename, isAbsolute, resolve } from 'path'
import type { ProjectData, BuildSystem } from '@shared/types'

/** 读取 .sublime-project（或任意 JSON 文件），相对 folder 路径解析为绝对路径 */
export async function readProject(filePath: string): Promise<ProjectData | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const obj = JSON.parse(raw) as ProjectData & { folders?: ({ path: string; name?: string } | string)[] }
    const base = dirname(filePath)
    const folders = (obj.folders ?? []).map((f) => {
      const p = typeof f === 'string' ? f : f.path
      const resolved = isAbsolute(p) ? p : resolve(base, p)
      return typeof f === 'string'
        ? { path: resolved }
        : { path: resolved, name: f.name, follow_symlinks: f.follow_symlinks }
    })
    return {
      folders,
      settings: obj.settings ?? {},
      build_systems: obj.build_systems ?? [],
      __projectPath: filePath
    }
  } catch {
    return null
  }
}

/** 在给定目录中查找 .sublime-project（优先唯一者，多个取第一个） */
export async function findProjectFile(dirPath: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const projects = entries
      .filter((e) => e.isFile() && e.name.endsWith('.sublime-project'))
      .map((e) => join(dirPath, e.name))
      .sort()
    return projects[0] ?? null
  } catch {
    return null
  }
}

/** 打开文件夹作为项目（若其中存在 .sublime-project 则读取，否则用默认 folders） */
export async function openFolderAsProject(folderPath: string): Promise<ProjectData> {
  const projectFile = await findProjectFile(folderPath)
  if (projectFile) {
    const proj = await readProject(projectFile)
    if (proj && proj.folders.length > 0) return proj
  }
  return { folders: [{ path: folderPath }], settings: {}, build_systems: [] }
}

export async function writeProject(filePath: string, data: ProjectData): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true })
  const obj = {
    folders: data.folders.map((f) => ({ path: f.path, ...(f.name ? { name: f.name } : {}) })),
    settings: data.settings ?? {},
    build_systems: data.build_systems ?? []
  }
  await fs.writeFile(filePath, JSON.stringify(obj, null, 4) + '\n', 'utf8')
}

export function defaultProjectName(folders: { path: string }[]): string {
  return folders.length ? basename(folders[0].path) : 'Untitled'
}

/** 合并平台差异的 build system（合并 base + 平台分支） */
export function mergeBuildSystemForPlatform(bs: BuildSystem, platform: NodeJS.Platform): BuildSystem {
  let result: BuildSystem = { ...bs }
  const platformKey = platform === 'darwin' ? 'osx' : platform === 'win32' ? 'windows' : 'linux'
  const branch = bs[platformKey as 'osx' | 'windows' | 'linux']
  if (branch) {
    result = { ...result, ...branch, variants: bs.variants }
    result.osx = undefined
    result.windows = undefined
    result.linux = undefined
  }
  delete result.osx
  delete result.windows
  delete result.linux
  return result
}