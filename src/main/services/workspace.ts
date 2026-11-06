import { app } from 'electron'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import type { WorkspaceState } from '@shared/types'

function workspacePath(): string {
  return join(app.getPath('userData'), 'sample-text', 'workspace.json')
}

export async function readWorkspace(): Promise<WorkspaceState> {
  try {
    const raw = await fs.readFile(workspacePath(), 'utf8')
    const obj = JSON.parse(raw) as Partial<WorkspaceState>
    return {
      openFiles: Array.isArray(obj.openFiles) ? obj.openFiles : [],
      activeFile: typeof obj.activeFile === 'string' ? obj.activeFile : null
    }
  } catch {
    return { openFiles: [], activeFile: null }
  }
}

export async function writeWorkspace(ws: WorkspaceState): Promise<void> {
  const p = workspacePath()
  await fs.mkdir(dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(ws, null, 2) + '\n', 'utf8')
}